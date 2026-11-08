"""Assemble and render the real exported GLBs at the shared gameplay coordinates."""
import bpy, os, sys, math, json
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
SRC=os.path.join(ROOT,'source-assets/private-bench-v1');ASSETS=os.path.join(ROOT,'client/assets/3d')
OUT=os.path.join(ASSETS,'private-bench-v1/previews');os.makedirs(OUT,exist_ok=True)
layout=json.load(open(os.path.join(SRC,'runtime-layout.json'),encoding='utf8'))
bpy.ops.wm.read_factory_settings(use_empty=True)

def place(name,file,x,y,rotation=0,scale=1,sx=1):
    before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=os.path.join(ASSETS,file+'.glb'))
    nodes=set(bpy.context.scene.objects)-before
    root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root)
    for o in nodes:
        if o.parent not in nodes:o.parent=root
    root.location=((x-400)/34,(y-300)/34,0);root.rotation_euler.z=-rotation;root.scale=(scale*sx,scale,scale)
    return root,nodes

def setup(width=1400,height=1050):
    s=bpy.context.scene;s.world=bpy.data.worlds.new('Garden daylight');s.world.use_nodes=True
    s.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.47,.55,.43,1)
    s.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
    for pos,power,size in [((-5,-5,10),1700,7),((6,3,8),950,6)]:
        bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.size=size
        light.rotation_euler=(Vector((0,0,.5))-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(2,-14,12));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=15;s.camera=camera
    camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler()
    s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=True;s.cycles.max_bounces=4
    s.render.resolution_x=width;s.render.resolution_y=height;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG'
    return s,camera

def render(s,camera,name,pos,target=(0,0,1),size=15):
    camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=size
    s.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True);print('RENDERED PRIVATE',name,flush=True)

if '--gallery' in sys.argv:
    manifest=json.load(open(os.path.join(ASSETS,'private-bench-v1/manifest.json'),encoding='utf8'))
    entries=[(a['id'],'private-bench-v1/'+a['id']) for a in manifest['assets']]+[('student','characters/private-garden-v1/student-polo')]
    font=bpy.data.fonts.load('C:/Windows/Fonts/segoeui.ttf')
    labelmat=bpy.data.materials.new('Preview label ink');labelmat.use_nodes=True;labelmat.diffuse_color=(.018,.045,.027,1)
    labelmat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.018,.045,.027,1)
    names={'pergola':'Chòi dây leo','bench':'Ghế đôi','tree':'Cây bóng mát','lamp':'Đèn sân vườn','flower-urn':'Chậu hoa','flowerbed':'Bồn hoa tròn','hedge':'Hàng rào cây','exit-portal':'Cổng thoát','paving':'Đường lát','garden-ground':'Nền và lối đi','student':'Sinh viên'}
    for i,(name,file) in enumerate(entries):
        root,nodes=place(name,file,400,300);bpy.context.view_layer.update()
        points=[o.matrix_world@Vector(v) for o in nodes if o.type=='MESH' for v in o.bound_box]
        lo=Vector(tuple(min(p[j] for p in points) for j in range(3)));hi=Vector(tuple(max(p[j] for p in points) for j in range(3)))
        scale=2.35/max(hi-lo);root.scale=(scale,)*3;root.location=(i%4*3.4-(lo.x+hi.x)/2*scale,-(i//4)*4.0-(lo.y+hi.y)/2*scale,-lo.z*scale)
        bpy.ops.object.text_add(location=(i%4*3.4,-(i//4)*4.0-1.7,.02));text=bpy.context.object;text.data.body=names[name];text.data.font=font;text.data.size=.28;text.data.align_x='CENTER';text.data.materials.append(labelmat)
    s,camera=setup(1600,1300);render(s,camera,'all-assets',(5.1,-15,23),(5.1,-4,.3),15.8)
else:
    for i,p in enumerate(layout['props']):place('prop-'+str(i),'private-bench-v1/'+p['file'],p['x'],p['y'],p.get('rotation',0),p['scale'])
    place('garden-floor','private-bench-v1/garden-ground',400,300)
    for i in range(6):place('hedge-back-'+str(i),'private-bench-v1/hedge',400+(-5+i*2)*34,461.5)
    for i in range(5):
        for x in [206.2,593.8]:place('hedge-side','private-bench-v1/hedge',x,300+(-4+i*2)*34,math.pi/2)
    for side in [-1,1]:
        for i in range(3):place('hedge-front','private-bench-v1/hedge',400+side*(1.7+i*1.6)*34,138.5,sx=.8)
    place('exit','private-bench-v1/exit-portal',layout['exit']['x'],layout['exit']['y'])
    # Preview actors are separate, not baked into the map used by the game.
    for i,x in enumerate([-.35,.35]):
        root,nodes=place('PREVIEW_PLAYER_'+str(i),'characters/private-garden-v1/student-polo',400+x*34,layout['seat']['y'])
        root.location.z=layout['seat']['height']-.69
        for o in nodes:
            if o.type!='EMPTY':continue
            if o.name.startswith('student_hip_'):o.rotation_mode='XYZ';o.rotation_euler.x=-1.5
            if o.name.startswith('student_knee_'):o.rotation_mode='XYZ';o.rotation_euler.x=1.48
            if o.name.startswith('student_shoulder_'):o.rotation_mode='XYZ';o.rotation_euler.x=-.15
    collision=bpy.data.collections.new('GAMEPLAY_COLLIDERS');bpy.context.scene.collection.children.link(collision);collision.hide_render=True
    for p in layout['props']+layout['barriers']:
        if not p.get('w'):continue
        bpy.ops.mesh.primitive_cube_add(size=1,location=((p['x']-400)/34,(p['y']-300)/34,.5));o=bpy.context.object
        o.name='COLLIDER_'+p.get('file',p.get('id','prop'));o.dimensions=(p['w']*2/34,p['d']*2/34,1);o.display_type='WIRE';o.hide_render=True
        for c in list(o.users_collection):c.objects.unlink(o)
        collision.objects.link(o)
    s,camera=setup();s['runtime_layout']='runtime-layout.json';s['units']='metres';s['preview_actors_not_gameplay_geometry']=True
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC,'private-garden-assembled.blend'))
    if '--save-only' in sys.argv:sys.exit(0)
    render(s,camera,'assembled-perspective',(2,-14,12))
    render(s,camera,'assembled-top',(0,-.001,20),(0,0,0),14.5)
