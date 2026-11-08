"""Assemble the exported GLBs at the actual shared game coordinates; render real meshes."""
import bpy,os,json,math,sys
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
SRC=os.path.join(ROOT,'source-assets/khu-a-coop-v1');ASSETS=os.path.join(ROOT,'client/assets/3d')
PACK=os.path.join(ASSETS,'khu-a-coop-v1');PREV=os.path.join(PACK,'previews');os.makedirs(PREV,exist_ok=True)
layout=json.load(open(os.path.join(SRC,'runtime-layout.json'),encoding='utf8'))
bpy.ops.wm.read_factory_settings(use_empty=True)

def place(name,file,x,y,scale=1,height=0,rotation=0,sx=1):
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ASSETS,file+'.glb'))
    created=set(bpy.context.scene.objects)-before
    root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root)
    for o in created:
        if o.parent not in created:o.parent=root
    root.location=((x-400)/34,(y-300)/34,height);root.rotation_euler.z=-rotation;root.scale=(scale*sx,scale,scale)
    return root

for i,p in enumerate(layout['props']):
    root=place('service-'+str(i),'khu-a-coop-v1/'+p['file'],p['x'],p['y'],p['scale'],rotation=p.get('rotation',0));root['action']=p.get('action','')
for x in [196,332,468,604]:
    for y in [164,300,436]:place('floor','khu-a-coop-v1/floor-module',x,y)
    place('rear-wall','khu-a-coop-v1/wall-window',x,504)
for x in [128,672]:
    for y in [164,300,436]:place('side-wall','khu-a-coop-v1/wall-low',x,y,rotation=math.pi/2)
for x in [238,562]:place('front-wall','khu-a-coop-v1/wall-low',x,96,sx=1.61)
place('prices','khu-a-coop-v1/price-board',355,482,.92,1.65)
place('orders','khu-a-coop-v1/order-board',438,482,.92,1.65)
for x in [166,634]:place('hanging-plant','khu-a-coop-v1/hanging-plant',x,494,height=2.7)
for x in [282,518]:place('flower-planter','khu-a-coop-v1/flower-planter',x,111)
for file,x,y in [('professor',400,470),('merchant',237,441),('merchant',563,441),('student',400,300)]:place(file,'characters/coop-v1/'+file,x,y)
place('main-map-exit','khu-a-coop-v1/exit-gate',layout['exit']['x'],layout['exit']['y'])
sys.path.insert(0,os.path.dirname(__file__))
from asset_modeling import material,torus,box
energy=material('exit.gold.energy',(1,.55,.08),.4,emission=2)
ey=(layout['exit']['y']-300)/34
torus('active_exit_threshold',1.275,.023,(0,ey,.035),energy)
for x in [-1.48,1.48]:box('active_exit_edge',(.035,.04,2.05),(x,ey-.16,1.05),energy)

# Save collision primitives separately from visible render geometry.
collision=bpy.data.collections.new('GAMEPLAY_COLLIDERS');bpy.context.scene.collection.children.link(collision);collision.hide_render=True
for p in layout['props']+layout['barriers']:
    if not p.get('w'):continue
    bpy.ops.mesh.primitive_cube_add(size=1,location=((p['x']-400)/34,(p['y']-300)/34,.5))
    o=bpy.context.object;o.name='COLLIDER_'+p.get('file',p.get('id','prop'));o.dimensions=(p['w']*2/34,p['d']*2/34,1)
    for c in list(o.users_collection):c.objects.unlink(o)
    collision.objects.link(o);o.display_type='WIRE';o.hide_render=True;o['action']=p.get('action','');o['not_render_geometry']=True
scene=bpy.context.scene;scene['units']='metres';scene['runtime_layout']='runtime-layout.json';scene['farm_locked']=True
scene.world=bpy.data.worlds.new('Warm studio');scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.15,.23,.19,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.7
for pos,energy,size in [((-5,-6,10),1800,8),((6,3,8),1000,7)]:
    bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=energy;o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-17,16));camera=bpy.context.object;target=Vector((0,0,1));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=20;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.cycles.max_bounces=4
scene.render.resolution_x=1400;scene.render.resolution_y=1050;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC,'khu-a-assembled.blend'))
for name,loc in [('assembled-isometric',(0,-17,16)),('assembled-top',(0,-.001,25))]:
    camera.location=loc;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(PREV,name+'.png');bpy.ops.render.render(write_still=True)
print('ASSEMBLED AND RENDERED KHU A',flush=True)
