"""Render exported GLBs, not image-generation concepts. Uses the same files as the browser."""
import bpy,os,sys,math,json
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
OUT=os.path.join(ROOT,'client','assets','3d')

def setup(scene,center,size,width=900,height=1000):
    scene.world=bpy.data.worlds.new('Soft neutral studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.65,.65,.65,1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
    bpy.ops.object.light_add(type='AREA',location=center+Vector((-2,-3,4))*size)
    light=bpy.context.object;light.data.energy=360*size*size;light.data.size=size*3
    bpy.ops.object.camera_add(location=center+Vector((0,-4,.1))*size)
    camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=size*1.20;scene.camera=camera
    scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
    scene.cycles.max_bounces=4;scene.render.resolution_x=width;scene.render.resolution_y=height;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';return camera

def bounds():
    bpy.context.view_layer.update()
    points=[obj.matrix_world@Vector(c) for obj in bpy.context.scene.objects if obj.type=='MESH' for c in obj.bound_box]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    return lo,hi

if '--student' in sys.argv:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,'characters','student-male-01.glb'))
    lo,hi=bounds();center=(lo+hi)/2;size=max(hi-lo)
    camera=setup(bpy.context.scene,center,size)
    folder=os.path.join(OUT,'characters','previews');os.makedirs(folder,exist_ok=True)
    views=[('front',(0,-4,0)),('back',(0,4,0)),('left',(-4,0,0)),('right',(4,0,0)),('top',(0,-.001,4)),('bottom',(0,-.001,-4))]
    for name,direction in views:
        camera.location=center+Vector(direction)*size;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
        bpy.context.scene.render.filepath=os.path.join(folder,name+'.png');bpy.ops.render.render(write_still=True)
        print('RENDERED STUDENT',name,flush=True)
else:
    folder=os.path.join(OUT,'community-farm-v2');assets=json.load(open(os.path.join(folder,'manifest.json'),encoding='utf8'))['assets']
    chosen=[a for a in assets if not any(word in a['file'] for word in ['growing','wilted','garden-floor','fence-rail','fence-post'])]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for i,asset in enumerate(chosen):
        before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=os.path.join(folder,asset['file']))
        new=set(bpy.context.scene.objects)-before;bpy.context.view_layer.update()
        points=[o.matrix_world@Vector(c) for o in new if o.type=='MESH' for c in o.bound_box]
        lo=Vector(tuple(min(p[j] for p in points) for j in range(3)));hi=Vector(tuple(max(p[j] for p in points) for j in range(3)))
        scale=2.4/max(hi-lo);root=bpy.data.objects.new(asset['file'],None);bpy.context.collection.objects.link(root)
        for o in new:
            if o.parent not in new:o.parent=root
        root.scale=(scale,)*3;root.location=(i%4*3.4-(lo.x+hi.x)/2*scale,-(i//4)*4.2-(lo.y+hi.y)/2*scale,-lo.z*scale)
    rows=math.ceil(len(chosen)/4);center=Vector((5.1,-(rows-1)*2.1,.5));camera=setup(bpy.context.scene,center,rows*4.5,1800,1900)
    camera.location=center+Vector((0,-17,23));camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=rows*4.6
    previews=os.path.join(folder,'previews');os.makedirs(previews,exist_ok=True)
    bpy.context.scene.render.filepath=os.path.join(previews,'all-assets.png');bpy.ops.render.render(write_still=True)
    print('RENDERED GARDEN GALLERY',len(chosen),flush=True)
