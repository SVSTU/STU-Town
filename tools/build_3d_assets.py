import bpy
import math
import os
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
        cube('bench_seat_slat', (2.55, 0.16, 0.10), (0, -0.04, 0.79 + index * 0.13), WOOD, 0.025)
        cube('bench_back_slat', (2.48, 0.12, 0.16), (0, 0.37, 1.39 + index * 0.17), WOOD, 0.025)
    export_selected(os.path.join(OUT, 'stone-bench.glb'))

def build_tree():
    trunk = cylinder('tree_trunk', .28, 2.2, 1.1, WOOD, vertices=12)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.35, location=(0, 0, 2.45))
    apply_mat(bpy.context.object, mat('Tree leaves', (0.18, 0.48, 0.16), roughness=.85))
    export_selected(os.path.join(OUT, 'tree.glb'))

def build_flowerbed():
    soil = mat('Flower soil', (0.25, 0.13, 0.07), roughness=.9)
    pink = mat('Flower pink', (0.88, 0.25, 0.42), roughness=.6)
    green = mat('Flower leaves', (0.20, 0.55, 0.18), roughness=.85)
    cylinder('flowerbed_soil', 1.25, .22, .11, soil, vertices=40)
    for index in range(7):
        angle = index * math.tau / 7
        x, y = math.cos(angle) * .72, math.sin(angle) * .72
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.2, location=(x, y, .36))
        apply_mat(bpy.context.object, pink if index % 2 else green)
    export_selected(os.path.join(OUT, 'flowerbed.glb'))

def build_lamp():
    metal = mat('Lamp metal', (0.03, 0.08, 0.12), metallic=.55, roughness=.35)
    glow = mat('Lamp glow', (1.0, .55, .12), roughness=.3)
    cylinder('lamp_pole', .09, 2.8, 1.4, metal, vertices=12)
    cylinder('lamp_cap', .30, .15, 2.82, metal, vertices=12)
    cylinder('lamp_glow', .17, .22, 2.63, glow, vertices=16)
    export_selected(os.path.join(OUT, 'lamp.glb'))

def build_pergola():
    wood = mat('Pergola wood', (0.42, .20, .08), roughness=.7)
    leaf = mat('Pergola vines', (.22, .52, .16), roughness=.85)
    for x in (-1.5, 1.5):
        for y in (-.9, .9): cube('pergola_post', (.18, .18, 2.2), (x, y, 1.1), wood)
    cube('pergola_roof', (3.5, 2.2, .18), (0, 0, 2.25), wood)
    for x in (-1.2, -.6, 0, .6, 1.2): cube('pergola_vine', (.45, 2.3, .14), (x, 0, 2.38), leaf, .02)
    export_selected(os.path.join(OUT, 'pergola.glb'))

def build_path():
    stone = mat('Path stone', (.72, .63, .48), roughness=.8)
    cube('walkway_tile', (3.0, 8.0, .08), (0, 0, .04), stone, .03)
    export_selected(os.path.join(OUT, 'path.glb'))

def build_railing():
    metal = mat('Railing metal', (.12, .15, .13), metallic=.5, roughness=.4)
    cube('railing_top', (4.0, .12, .12), (0, 0, 1.05), metal, .02)
    for x in (-1.8, -1.2, -.6, 0, .6, 1.2, 1.8): cube('railing_post', (.09, .09, 1.0), (x, 0, .5), metal, .015)
    export_selected(os.path.join(OUT, 'railing.glb'))

build_fountain()
build_bench()
build_tree()
build_flowerbed()
build_lamp()
build_pergola()
build_path()
build_railing()
