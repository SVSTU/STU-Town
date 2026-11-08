"""Assemble real runtime GLBs, preserve editability, render the built classroom."""
import bpy,os,sys,json,math,re
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'));SRC=os.path.join(ROOT,'source-assets/lecture-v1')
ASSETS=os.path.join(ROOT,'client/assets/3d');PREV=os.path.join(ASSETS,'lecture-v1/previews');os.makedirs(PREV,exist_ok=True)
placements=json.load(open(os.path.join(SRC,'placements.json'),encoding='utf8'))['placements']
layout=json.load(open(os.path.join(SRC,'runtime-layout.json'),encoding='utf8'))
bpy.ops.wm.read_factory_settings(use_empty=True)
for p in placements:
    before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=os.path.join(ASSETS,p['file']))
    created=set(bpy.context.scene.objects)-before
    if p.get('pose')=='seated':
        for o in created:
            m=re.match(r'^student_(hip|knee|shoulder|elbow)_(left|right)(?:\.\d+)?$',o.name)
            if m:
                rest=o.rotation_quaternion.to_euler('XYZ') if o.rotation_mode=='QUATERNION' else o.rotation_euler.copy()
                o.rotation_mode='XYZ';o.rotation_euler=rest;o.rotation_euler.x+={'hip':-1.5,'knee':1.48,'shoulder':-.15,'elbow':-.28}[m[1]]
    root=bpy.data.objects.new(p['id'],None);bpy.context.collection.objects.link(root)
    for o in created:
        if o.parent not in created:o.parent=root
    root.location=((p['x']-400)/34,(p['y']-300)/34,p.get('height',0));root.rotation_euler.z=-p.get('rotation',0)
    root.scale=(p['scale']*p.get('scaleX',1),p['scale'],p['scale']);root['source_glb']=p['file'];root['action']=p.get('action','')
# The local player's neutral pose is a separate reusable actor, not part of floor or furniture.
before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=os.path.join(ASSETS,'characters/campus-v1/student.glb'))
for o in set(bpy.context.scene.objects)-before:
    if not o.parent:o.location.y-=.4
sys.path.insert(0,os.path.dirname(__file__))
from asset_modeling import material,torus,box
energy=material('lecture.exit.energy',(1,.6,.1),.5,emission=2)
torus('active_exit_threshold',1.3,.025,(0,(layout['exit']['y']-300)/34,.035),energy)
# Slide contains geometric bars only, matching the renderer's non-text decorative diagram.
paper=material('lecture.slide.paper',(.90,.86,.72));blue=material('lecture.slide.ink',(.18,.31,.42))
box('projected_slide',(2.9,.01,1.62),(.6,(526-300)/34-.048,2.32),paper,0)
for i,h in enumerate([.34,.53,.8,1.08]):box('slide_bar',(.20,.014,h),(-.60+i*.30,(526-300)/34-.06,1.78+h/2),blue,0)
collision=bpy.data.collections.new('GAMEPLAY_COLLIDERS');bpy.context.scene.collection.children.link(collision);collision.hide_render=True
for p in layout['props']+layout['barriers']:
    if not p.get('w'):continue
    bpy.ops.mesh.primitive_cube_add(size=1,location=((p['x']-400)/34,(p['y']-300)/34,p.get('height',0)+.5))
    o=bpy.context.object;o.name='COLLIDER_'+p.get('file',p.get('id','prop'));o.dimensions=(p['w']*2/34,p['d']*2/34,1)
    for c in list(o.users_collection):c.objects.unlink(o)
    collision.objects.link(o);o.display_type='WIRE';o.hide_render=True
scene=bpy.context.scene;scene['units']='metres';scene['runtime_layout']='runtime-layout.json';scene['placement_source']='placements.json'
scene.world=bpy.data.worlds.new('Warm classroom studio');scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.15,.23,.19,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.7
for pos,energy,size in [((-6,-8,12),2400,9),((7,3,10),1500,8)]:
    bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=energy;o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(11,-19,17));camera=bpy.context.object;target=Vector((0,0,1));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=25;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.cycles.max_bounces=4
scene.render.resolution_x=1400;scene.render.resolution_y=1050;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
for p in placements:
    if p['id'].startswith('lecture-side-right-') or p['id']=='lecture-notice':
        for o in bpy.data.objects[p['id']].children_recursive:o.hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC,'khu-c-assembled.blend'))
if '--save-only' in sys.argv:sys.exit(0)
for name,loc in [('assembled-isometric',(11,-19,17)),('assembled-top',(0,-.001,28))]:
    if '--isometric-only' in sys.argv and name!='assembled-isometric':continue
    for p in placements:
        if p['id'].startswith('lecture-side-right-') or p['id']=='lecture-notice':
            root=bpy.data.objects.get(p['id'])
            for o in root.children_recursive:o.hide_render=loc[0]>8.5
    camera.location=loc;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(PREV,name+'.png');bpy.ops.render.render(write_still=True)
print('ASSEMBLED AND RENDERED KHU C',flush=True)
