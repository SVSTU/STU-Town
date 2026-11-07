import bpy
import math
import os
import random
from mathutils import Vector

try:
    bpy.ops.preferences.addon_enable(module='io_scene_gltf2')
except Exception:
    pass

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'client', 'assets', '3d')
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, metallic=0.0, roughness=0.55):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1.0)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return m

STONE = mat('Cream stone', (0.78, 0.70, 0.53), roughness=0.72)
STONE_LIGHT = mat('Stone highlight', (0.92, 0.84, 0.66), roughness=0.68)
WOOD = mat('Warm wood', (0.42, 0.20, 0.08), roughness=0.62)
METAL = mat('Dark metal', (0.06, 0.07, 0.07), metallic=0.65, roughness=0.35)
WATER = mat('Turquoise water', (0.03, 0.53, 0.68), roughness=0.18)

def apply_mat(obj, material):
    obj.data.materials.append(material)
    return obj

def cylinder(name, radius, depth, z, material, vertices=48, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=(0, 0, z))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return apply_mat(obj, material)

def cube(name, size, location, material, bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('soft edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return apply_mat(obj, material)

def torus(name, major, minor, z, material):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=64, minor_segments=16, location=(0, 0, z))
    obj = bpy.context.object
    obj.name = name
    return apply_mat(obj, material)

def clear_selection():
    bpy.ops.object.select_all(action='DESELECT')

def export_selected(path):
    clear_selection()
    for obj in bpy.context.scene.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.context.scene.objects[0] if bpy.context.scene.objects else None
    export_op = getattr(bpy.ops.export_scene, 'gltf', None)
    if export_op is None:
        raise RuntimeError('Blender glTF exporter is not available. Enable the io_scene_gltf2 add-on.')
    export_op(filepath=path, export_format='GLB', export_materials='EXPORT', export_apply=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def build_fountain():
    # Multi-tier reference fountain: circular plinth, lower basin, bowl, pillar and top jet.
    cylinder('fountain_plinth', 3.25, 0.42, 0.21, STONE_LIGHT)
    torus('fountain_outer_rim', 2.95, 0.18, 0.52, STONE)
    cylinder('fountain_water_basin', 2.75, 0.16, 0.60, WATER)
    cylinder('fountain_lower_bowl', 1.55, 0.34, 1.05, STONE)
    cylinder('fountain_lower_pedestal', 0.68, 0.78, 1.44, STONE_LIGHT)
    cylinder('fountain_middle_bowl', 1.12, 0.28, 1.90, STONE)
    cylinder('fountain_middle_pillar', 0.26, 0.85, 2.31, STONE_LIGHT)
    cylinder('fountain_upper_bowl', 0.78, 0.22, 2.78, STONE)
    cylinder('fountain_top_pillar', 0.18, 0.45, 3.08, STONE_LIGHT)
    for index in range(8):
        angle = index * math.tau / 8
        x, y = math.cos(angle) * 2.25, math.sin(angle) * 2.25
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.055, depth=1.25, location=(x, y, 1.0))
        jet = bpy.context.object
        jet.name = f'fountain_jet_{index+1}'
        jet.rotation_euler[1] = math.sin(angle) * 0.22
        jet.rotation_euler[0] = -math.cos(angle) * 0.22
        apply_mat(jet, WATER)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.13, location=(0, 0, 3.42))
    apply_mat(bpy.context.object, WATER)
    export_selected(os.path.join(OUT, 'fountain.glb'))

def build_bench():
    # Reference bench: two stone piers, wood slats, backrest and dark brackets.
    for x in (-1.15, 1.15):
        cube('bench_stone_pier', (0.52, 0.68, 1.12), (x, 0, 0.56), STONE_LIGHT, 0.08)
        cube('bench_stone_cap', (0.72, 0.86, 0.18), (x, 0, 1.18), STONE, 0.06)
        cube('bench_stone_base', (0.72, 0.90, 0.18), (x, 0, 0.08), STONE, 0.06)
        cube('bench_bracket', (0.12, 0.12, 0.72), (x, 0.34, 0.84), METAL, 0.025)
    for index in range(3):
        cube('bench_seat_slat', (2.55, 0.18, 0.10), (0, -.22 + index * .20, .89), WOOD, 0.025)
        cube('bench_back_slat', (2.48, 0.12, 0.16), (0, 0.37, 1.39 + index * 0.17), WOOD, 0.025)
    for x in (-1.22, 1.22):
        tube('bench_armrest', [(x,-.30,1.02),(x,-.30,1.25),(x,.25,1.25),(x,.34,1.12)], .045, METAL)
        for z in (1.39,1.56,1.73):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=.025,location=(x,.30,z))
            apply_mat(bpy.context.object,METAL)
    export_selected(os.path.join(OUT, 'stone-bench.glb'))

def build_tree():
    trunk = cylinder('tree_trunk', .30, 2.5, 1.25, WOOD, vertices=12)
    leaves_a = mat('Tree leaves light', (0.28, 0.65, 0.18), roughness=.85)
    leaves_b = mat('Tree leaves dark', (0.14, 0.42, 0.12), roughness=.85)
    # Clustered crowns read closer to the reference park trees than one sphere.
    for index, (x, y, z, radius, material) in enumerate([
        (-.55, 0, 2.35, 1.0, leaves_a), (.55, 0, 2.35, 1.0, leaves_b),
        (0, -.25, 2.85, 1.05, leaves_a), (0, .35, 2.65, .9, leaves_b)
    ]):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=radius, location=(x, y, z))
        bpy.context.object.name = f'tree_crown_{index}'
        apply_mat(bpy.context.object, material)
    export_selected(os.path.join(OUT, 'tree.glb'))

def build_flowerbed():
    soil = mat('Flower soil', (0.25, 0.13, 0.07), roughness=.9)
    pink = mat('Flower pink', (0.88, 0.25, 0.42), roughness=.6)
    green = mat('Flower leaves', (0.20, 0.55, 0.18), roughness=.85)
    cube('flowerbed_soil', (2.55, 1.45, .22), (0, 0, .11), soil, .12)
    for y in (-.73, .73): cube('planter_long_border', (2.8, .17, .40), (0, y, .20), STONE_LIGHT)
    for x in (-1.32, 1.32): cube('planter_end_border', (.17, 1.45, .40), (x, 0, .20), STONE_LIGHT)
    rng = random.Random(25)
    for index in range(42):
        x,y = rng.uniform(-1.14,1.14),rng.uniform(-.55,.55)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=rng.uniform(.12,.23),location=(x,y,.40))
        bpy.context.object.scale=(1,.7,.65)
        apply_mat(bpy.context.object,green)
    for x in (-1.0,-.5,0,.5,1.0):
        cube('planter_stone_joint',(.012,.015,.3),(x,-.822,.2),STONE,0)
    for index, (x, y) in enumerate([(-.85, -.38), (-.28, -.35), (.32, -.36), (.88, -.35),
                                     (-.62, .3), (0, .28), (.62, .3)]):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.2, location=(x, y, .37))
        apply_mat(bpy.context.object, pink if index % 2 else green)
        for petal in range(5):
            angle = petal * math.tau / 5
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.09, location=(x + math.cos(angle)*.12, y + math.sin(angle)*.12, .57))
            apply_mat(bpy.context.object, pink)
    export_selected(os.path.join(OUT, 'flowerbed.glb'))

def build_lamp():
    metal = mat('Lamp metal', (0.03, 0.08, 0.12), metallic=.55, roughness=.35)
    glow = mat('Lamp glow', (1.0, .55, .12), roughness=.3)
    cylinder('lamp_pole', .09, 2.8, 1.4, metal, vertices=12)
    cylinder('lamp_foot', .23, .14, .07, metal)
    cylinder('lamp_lantern_base', .24, .10, 2.65, metal, vertices=4)
    cube('lamp_glass', (.30, .30, .45), (0, 0, 2.92), glow)
    bsdf=glow.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Emission Color'].default_value=(1,.55,.12,1)
    bsdf.inputs['Emission Strength'].default_value=.65
    for z,radius in ((.18,.18),(.32,.14),(2.55,.15),(3.15,.26)):
        cylinder('lamp_decorative_collar',radius,.06,z,metal,vertices=16)
    for x in (-.18, .18):
        for y in (-.18, .18): cube('lamp_frame', (.035, .035, .50), (x, y, 2.92), metal, .005)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=.39, radius2=0, depth=.30, location=(0,0,3.29))
    apply_mat(bpy.context.object, metal)
    cylinder('lamp_finial',.045,.15,3.48,metal,vertices=12)
    export_selected(os.path.join(OUT, 'lamp.glb'))

def build_pergola():
    wood = mat('Pergola wood', (0.42, .20, .08), roughness=.7)
    leaf = mat('Pergola vines', (.22, .52, .16), roughness=.85)
    cube('pergola_platform',(3.8,2.75,.14),(0,0,.07),STONE_LIGHT,.08)
    for index in range(12):
        cube('pergola_floorboard',(.28,2.48,.06),(-1.65+index*.3,0,.17),wood,.015)
    for x in (-1.5, 1.5):
        for y in (-.9, .9): cube('pergola_post', (.18, .18, 2.2), (x, y, 1.1), wood)
    for y in (-.9, .9): cube('pergola_beam', (3.5, .16, .22), (0, y, 2.25), wood)
    for x in (-1.5, -1, -.5, 0, .5, 1, 1.5): cube('pergola_roof_slat', (.16, 2.4, .16), (x, 0, 2.43), wood)
    for x in (-1.5, 1.5):
        for y in (-.9, .9): cube('pergola_stone_foot', (.40, .40, .35), (x, y, .175), STONE_LIGHT)
    for z in (.62,.82,1.02): cube('pergola_bench_back',(2.65,.12,.14),(0,.65,z),WOOD)
    for y in (.20,.40,.60): cube('pergola_bench_seat',(2.65,.18,.10),(0,y,.55),WOOD)
    for x in (-1.1,1.1): cube('pergola_bench_leg',(.16,.45,.45),(x,.4,.33),WOOD)
    rng=random.Random(57)
    for index in range(65):
        x,y=rng.uniform(-1.65,1.65),rng.uniform(-1.1,1.1)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=rng.uniform(.12,.24),location=(x,y,2.54))
        bpy.context.object.scale=(1,.65,.3); apply_mat(bpy.context.object,leaf)
    for x in (-1.5,1.5):
        tube('pergola_climbing_vine',[(x+.08*math.sin(i),-.9, .3+i*.11) for i in range(21)],.025,leaf)
    for index, (x, y) in enumerate([(-1.1, -.55), (-.35, .45), (.45, -.45), (1.1, .5)]):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.34, location=(x, y, 2.42))
        bpy.context.object.name = f'pergola_leaf_{index}'
        apply_mat(bpy.context.object, leaf)
    export_selected(os.path.join(OUT, 'pergola.glb'))

def build_path():
    stone = mat('Path stone', (.72, .63, .48), roughness=.8)
    colors=[stone,STONE_LIGHT,mat('Peach paving',(.78,.57,.40),roughness=.8)]
    for row in range(16):
        for col in range(6):
            cube('walkway_paver',(.488,.488,.07),(-1.25+col*.5,-3.75+row*.5,.035),colors[(row+col)%3],.012)
    export_selected(os.path.join(OUT, 'path.glb'))

def build_railing():
    metal = mat('Railing metal', (.12, .15, .13), metallic=.5, roughness=.4)
    cube('railing_top', (4.0, .12, .12), (0, 0, 1.05), metal, .02)
    for x in (-1.8, -1.2, -.6, 0, .6, 1.2, 1.8): cube('railing_post', (.09, .09, 1.0), (x, 0, .5), metal, .015)
    export_selected(os.path.join(OUT, 'railing.glb'))

def tube(name, points, radius, material):
    curve = bpy.data.curves.new(name, 'CURVE'); curve.dimensions = '3D'
    curve.bevel_depth = radius; curve.bevel_resolution = 2
    line = curve.splines.new('POLY'); line.points.add(len(points)-1)
    for point, xyz in zip(line.points, points): point.co = (*xyz, 1)
    obj = bpy.data.objects.new(name, curve); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    bpy.context.view_layer.objects.active = obj; obj.select_set(True)
    bpy.ops.object.convert(target='MESH'); obj.select_set(False)

def detailed_fountain():
    cylinder('fountain_foundation', 3.15, .24, .12, STONE)
    torus('fountain_basin_wall', 2.94, .18, .40, STONE_LIGHT)
    cylinder('fountain_water_basin', 2.78, .06, .39, WATER)
    foam = mat('Water highlights', (.65,.95,1), roughness=.2)
    for radius, height in [(1.65,1.22), (.84,2.12)]:
        cylinder('fountain_pedestal', radius*.27, height-.4, (height+.4)/2, STONE_LIGHT)
        cylinder('fountain_bowl', radius, .18, height-.08, STONE)
        torus('fountain_bowl_lip', radius-.05, .085, height, STONE_LIGHT)
        cylinder('fountain_water_pool', radius-.14, .045, height, WATER)
        for index in range(16):
            a = index*math.tau/16
            points = [(math.cos(a)*(radius+.12*t), math.sin(a)*(radius+.12*t), height-.03-(height-.46)*t*t) for t in [j/12 for j in range(13)]]
            tube('fountain_waterfall', points, .024, foam if index%3==0 else WATER)
    for index in range(8):
        a = index*math.tau/8
        tube('fountain_jet_arc', [(math.cos(a)*.60*t, math.sin(a)*.60*t, 2.14+2.5*t-2.5*t*t) for t in [j/24 for j in range(25)]], .035, foam)
    for radius in (1.95,2.35): torus('fountain_water_ripple', radius, .012, .43, foam)
    export_selected(os.path.join(OUT, 'fountain.glb'))

def detailed_tree():
    rng = random.Random(48)
    greens = [mat('Leaf shade '+str(i), c, roughness=.85) for i,c in enumerate([(.25,.51,.08),(.41,.65,.10),(.53,.72,.14),(.16,.39,.07)])]
    tube('tree_trunk', [(0,0,0),(.05,0,1),(-.12,.04,2),(.12,0,3.1)], .22, WOOD)
    for index in range(9):
        angle=index*math.tau/9
        end=Vector((math.cos(angle)*1.05, math.sin(angle)*1.05, 2.65+rng.random()*.8))
        tube('tree_branch', [(0,0,1.4),tuple(end*.7),tuple(end)], .075, WOOD)
        for leaf in range(12):
            pos=end+Vector((rng.uniform(-.65,.65),rng.uniform(-.65,.65),rng.uniform(-.25,.55)))
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=rng.uniform(.25,.47),location=pos)
            obj=bpy.context.object; obj.name='tree_leaf_cluster'; obj.scale=(1.1,.85,.7)
            apply_mat(obj,greens[rng.randrange(len(greens))])
    export_selected(os.path.join(OUT, 'tree.glb'))

detailed_fountain()
build_bench()
detailed_tree()
build_flowerbed()
build_lamp()
build_pergola()
build_path()
build_railing()
