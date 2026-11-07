"""Contact sheet rendered from exported GLBs, with normalized display scales."""
import bpy,os,json,math
from mathutils import Vector
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','client','assets','3d','canteen-v2'))
with open(os.path.join(root,'manifest.json'),encoding='utf8') as handle:assets=json.load(handle)['assets']
bpy.ops.wm.read_factory_settings(use_empty=True)
for index,asset in enumerate(assets):
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(root,asset['file']))
    objects=set(bpy.context.scene.objects)-before
    bpy.context.view_layer.update()
    points=[obj.matrix_world@Vector(c) for obj in objects if obj.type=='MESH' for c in obj.bound_box]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    scale=2.65/max(hi-lo)
    parent=bpy.data.objects.new('gallery-'+asset['name'],None);bpy.context.collection.objects.link(parent)
    for obj in objects:
        if obj.parent not in objects:obj.parent=parent
    x=(index%4)*3.5;y=-(index//4)*5.0
    parent.scale=(scale,)*3
    parent.location=(x-(lo.x+hi.x)/2*scale,y-(lo.y+hi.y)/2*scale,-lo.z*scale)
    bpy.ops.object.text_add(location=(x,y-1.6,.02))
    label=bpy.context.object;label.data.body=f'{index+1:02}  '+asset['name'];label.data.size=.17;label.data.align_x='CENTER'
scene=bpy.context.scene;scene.world=bpy.data.worlds.new('Gallery');scene.world.color=(.44,.44,.44)
center=Vector((5.25,-7.5,.7))
bpy.ops.object.camera_add(location=center+Vector((1,-20,20)))
camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=17.8;scene.camera=camera
bpy.ops.object.light_add(type='AREA',location=(3,-9,16));bpy.context.object.data.energy=8000;bpy.context.object.data.size=12
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=2000;scene.render.resolution_y=1800;scene.render.resolution_percentage=100
scene.render.filepath=os.path.join(root,'previews','all-assets.png');bpy.ops.render.render(write_still=True)
print('GALLERY COMPLETE',flush=True)
