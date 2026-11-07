import bpy, os, math, sys
from mathutils import Vector
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'client', 'assets', '3d'))
out = os.path.join(root, 'previews')
os.makedirs(out, exist_ok=True)
for filename in sorted(os.listdir(root)):
    if not filename.endswith('.glb'): continue
    if '--' in sys.argv and filename not in sys.argv[sys.argv.index('--')+1:]: continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(root, filename))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    points = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center = (lo + hi) / 2
    size = max(hi - lo)
    bpy.ops.object.camera_add(location=center + Vector((1.3, -1.8, 1.15)) * size)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'; camera.data.ortho_scale = size * 1.55
    scene = bpy.context.scene; scene.camera = camera
    bpy.ops.object.light_add(type='AREA', location=center + Vector((2,-3,5))*size)
    bpy.context.object.data.energy = 450 * size * size; bpy.context.object.data.shape = 'DISK'; bpy.context.object.data.size = size*3
    scene.world = bpy.data.worlds.new('Preview world')
    scene.world.color = (.6,.6,.6)
    scene.render.engine = 'CYCLES'; scene.cycles.samples = 24
    scene.render.resolution_x = 800; scene.render.resolution_y = 800; scene.render.resolution_percentage = 100
    scene.render.filepath = os.path.join(out, filename.replace('.glb','.png'))
    bpy.ops.render.render(write_still=True)
    if filename == 'student.glb':
        scene.cycles.samples = 16
        for direction, offset in [('front',(0,-3,0)),('back',(0,3,0)),('left',(-3,0,0)),('right',(3,0,0)),('top',(0,0,3)),('bottom',(0,0,-3))]:
            camera.location = center + Vector(offset)*size
            camera.rotation_euler = (center-camera.location).to_track_quat('-Z','Y').to_euler()
            scene.render.filepath = os.path.join(out,'student-'+direction+'.png')
            bpy.ops.render.render(write_still=True)
