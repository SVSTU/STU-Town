"""Build reusable, metre-scale GLB props and render their actual exports.
Blender: --background --python tools/build_map_asset_packs.py
"""
import os, math, json, random, sys
import bpy
from mathutils import Vector
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import build_3d_assets as a

ROOT = a.ROOT
BASE = os.path.join(ROOT, 'client', 'assets', '3d')
wood, stone, metal = a.WOOD, a.STONE_LIGHT, a.METAL
green = a.mat('Leaf green', (.18,.43,.055))
orange = a.mat('Pumpkin orange', (.87,.24,.015))
purple = a.mat('Midnight purple', (.13,.035,.22))
gold = a.mat('Warm brass', (.68,.40,.07), metallic=.55)
red = a.mat('Tomato red', (.68,.055,.025))
cream = a.mat('Ivory', (.91,.84,.66))
teal = a.mat('Enamel teal', (.035,.32,.34), metallic=.15)
soil = a.mat('Rich soil', (.18,.075,.025))
yellow = a.mat('Corn yellow', (.88,.58,.045))
white = a.mat('Porcelain', (.88,.9,.85))
blue = a.mat('Bottle blue', (.10,.42,.66), roughness=.2)
glow = a.mat('Amber lantern glass', (1,.42,.035))
bsdf = glow.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Emission Color'].default_value = (1,.25,.015,1)
bsdf.inputs['Emission Strength'].default_value = 1.6
cyan = a.mat('Portal cyan', (.04,.65,.78))
cyan.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(.04,.65,.78,1)
cyan.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=1.2

def ball(name, pos, scale, mat, facets=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=facets,radius=1,location=pos)
    obj=bpy.context.object; obj.name=name; obj.scale=scale; a.apply_mat(obj,mat)
    return obj

def cylinder(name,radius,depth,pos,mat,vertices=24):
    obj=a.cylinder(name,radius,depth,pos[2],mat,vertices=vertices)
    obj.location.x, obj.location.y=pos[0],pos[1]
    return obj

def beam(name,start,end,width,mat):
    start,end=Vector(start),Vector(end)
    obj=a.cube(name,(width,width,(end-start).length),(start+end)/2,mat,.012)
    obj.rotation_euler=(end-start).to_track_quat('Z','Y').to_euler()
    return obj

def sign(text,pos,width=1,mat=cream):
    board=a.cube('sign_board',(width,.07,.30),pos,mat)
    bpy.ops.object.text_add(location=(pos[0],pos[1]-.041,pos[2]-.065),rotation=(math.pi/2,0,0))
    obj=bpy.context.object; obj.name='sign_lettering'; obj.data.body=text
    obj.data.align_x='CENTER'; obj.data.size=min(.14,width/max(1,len(text))*.95)
    obj.data.extrude=.001; obj.data.materials.append(metal)
    bpy.ops.object.convert(target='MESH')

def pumpkin():
    for i in range(10):
        t=i*math.tau/10
        ball('pumpkin_rib',(math.cos(t)*.23,math.sin(t)*.23,.42),(.25,.25,.37),orange)
    a.tube('pumpkin_stem',[(0,0,.69),(.035,0,.89),(.12,0,.93)],.055,wood)
    for x in (-.16,.16):
        obj=a.cube('pumpkin_glowing_eye',(.12,.025,.12),(x,-.446,.49),glow,.015)
        obj.rotation_euler[1]=math.pi/4
    a.tube('pumpkin_smile',[(-.23,-.432,.32),(-.13,-.474,.25),(0,-.485,.23),(.13,-.474,.25),(.23,-.432,.32)],.025,glow)

def gift(opened=False):
    a.cube('gift_body',(.72,.64,.55),(0,0,.275),purple)
    a.cube('gift_ribbon_front',(.10,.655,.55),(0,0,.28),gold,.008)
    a.cube('gift_ribbon_side',(.735,.10,.55),(0,0,.28),gold,.008)
    lid=a.cube('gift_lid',(.79,.71,.12),(0,.40 if opened else 0,.85 if opened else .61),purple)
    lid.rotation_euler[0]=-.9 if opened else 0
    for x in (-.13,.13):
        obj=ball('gift_bow',(x,.4 if opened else 0,.98 if opened else .72),(.16,.07,.09),gold)
        obj.rotation_euler[1]=.3 if x<0 else -.3
    if opened: a.cube('gift_inner',(.58,.50,.04),(0,0,.56),metal)

def spider():
    ball('spider_abdomen',(0,.15,.27),(.25,.30,.22),purple)
    ball('spider_head',(0,-.18,.24),(.18,.16,.15),metal)
    for x in (-.065,.065): ball('spider_eye',(x,-.325,.29),(.032,.023,.035),glow)
    for side in (-1,1):
        for i in range(4):
            y=-.20+i*.13
            a.tube('spider_leg',[(side*.13,y,.25),(side*.41,y+(i-1.5)*.10,.39),(side*.65,y+(i-1.5)*.17,.045)],.026,metal)

def lantern():
    cylinder('lantern_base',.22,.08,(0,0,.04),metal)
    cylinder('lantern_glass',.17,.43,(0,0,.30),glow,8)
    for i in range(6):
        t=i*math.tau/6
        beam('lantern_cage',(math.cos(t)*.19,math.sin(t)*.19,.07),(math.cos(t)*.19,math.sin(t)*.19,.53),.025,metal)
    cylinder('lantern_roof',.25,.10,(0,0,.55),metal,8)
    obj=a.torus('lantern_handle',.12,.016,.74,metal); obj.rotation_euler[0]=math.pi/2

def portal():
    cylinder('portal_pedestal',.8,.18,(0,0,.09),stone)
    obj=a.torus('portal_frame',.65,.09,.89,purple); obj.rotation_euler[0]=math.pi/2
    obj=a.torus('portal_energy',.51,.035,.89,cyan); obj.rotation_euler[0]=math.pi/2
    for i in range(3):
        points=[]
        for j in range(40):
            t=j/39; angle=t*math.tau*1.4+i*math.tau/3
            points.append((math.cos(angle)*.46*t,-.02,.89+math.sin(angle)*.46*t))
        a.tube('portal_spiral',points,.014,cyan)

def tree():
    a.tube('dead_tree_trunk',[(0,0,0),(.05,0,.8),(-.05,0,1.6),(.15,0,2.2)],.11,wood)
    for s in (-1,1):
        a.tube('dead_tree_branch',[(0,0,.9),(s*.43,0,1.35),(s*.65,.04,1.9)],.065,wood)
        a.tube('dead_tree_twig',[(s*.43,0,1.35),(s*.83,.03,1.6)],.03,wood)

def fence():
    for x in (-.9,.9):
        a.cube('fence_post',(.13,.14,1.1),(x,0,.55),wood)
        ball('fence_cap',(x,0,1.13),(.11,.11,.09),gold,1)
    for z in (.36,.78): a.cube('fence_rail',(1.95,.10,.11),(0,0,z),wood)
    for x in (-.6,-.3,0,.3,.6): a.cube('fence_picket',(.08,.08,.84),(x,0,.53),wood)

def crop(kind,pos=(0,0,0),scale=1):
    before=set(bpy.context.scene.objects)
    if kind=='carrot':
        for i in range(5):
            t=i*math.tau/5
            ball('carrot_leaf',(math.cos(t)*.10,math.sin(t)*.10,.29),(.035,.06,.24),green,1)
        ball('carrot_root',(0,0,.07),(.075,.075,.17),orange)
    elif kind=='corn':
        beam('corn_stalk',(0,0,0),(0,0,.9),.035,green)
        for i in range(5):
            obj=ball('corn_leaf',((i%2-.5)*.21,0,.20+i*.12),(.20,.06,.045),green,1); obj.rotation_euler[1]=(-1 if i%2 else 1)*.45
        ball('corn_cob',(.09,-.02,.57),(.065,.06,.18),yellow)
    else:
        for i in range(5):
            t=i*math.tau/5
            ball('crop_foliage',(math.cos(t)*.12,math.sin(t)*.12,.25),(.15,.12,.13),green,1)
            ball(kind+'_fruit',(math.cos(t)*.19,math.sin(t)*.19,.21),(.065,.06,.08 if kind=='strawberry' else .06),red)
    for obj in set(bpy.context.scene.objects)-before:
        obj.location=Vector(pos)+obj.location*scale; obj.scale*=scale

def plot(kind='empty'):
    a.cube('plot_border',(1.65,1.15,.14),(0,0,.07),wood)
    a.cube('plot_soil',(1.48,.98,.15),(0,0,.14),soil)
    for x in (-.48,0,.48): a.cube('plot_ridge',(.15,.85,.06),(x,0,.23),soil)
    if kind!='empty':
        for x in (-.48,0,.48):
            for y in (-.26,.26): crop(kind,(x,y,.24),.65)

def stall(produce=False):
    a.cube('stall_base',(1.7,.8,.75),(0,0,.375),wood)
    for x in (-.73,.73):
        beam('stall_post',(x,.25,0),(x,.25,1.95),.085,wood)
    for i in range(8): a.cube('stall_awning_panel',(.23,1.1,.10),(-.8+i*.23,-.05,1.83),cream if i%2 else teal,.01)
    sign('PRODUCE' if produce else 'SEEDS',(0,-.42,1.10),1.35)
    for i,kind in enumerate(('carrot','tomato','corn','strawberry')):
        x=-.60+i*.4
        a.cube('stall_tray',(.35,.58,.10),(x,0,.80),stone)
        if produce: crop(kind,(x,-.06,.84),.55)
        else:
            a.cube('seed_packet',(.23,.08,.26),(x,-.08,.98),cream,.015)
            ball('seed_packet_badge',(x,-.128,.99),(.055,.012,.055),orange if i==0 else red if i%2 else green,1)

def terminal(card=False):
    a.cube('machine_plinth',(.85,.65,.12),(0,0,.06),metal)
    a.cube('machine_body',(.74,.55,1.40),(0,0,.82),purple if card else teal,.09)
    a.cube('machine_display',(.52,.035,.42),(0,-.29,1.16),cyan,.025)
    sign('CARDS' if card else 'RECOVERY',(0,-.31,1.57),.80)
    a.cube('machine_slot',(.38,.04,.075),(0,-.30,.59),metal)
    for x in (-.15,0,.15): ball('machine_button',(x,-.30,.85),(.04,.025,.04),gold)

def professor():
    # A distinct NPC with coat, glasses and a book; all meshes remain editable.
    skin=a.mat('Professor skin',(.77,.46,.28))
    a.cube('professor_coat',(.50,.29,.65),(0,0,1.10),white,.08)
    ball('professor_head',(0,0,1.68),(.23,.20,.27),skin)
    ball('professor_hair',(0,.05,1.86),(.24,.19,.11),stone)
    for x in (-.09,.09):
        obj=a.torus('professor_glasses',.055,.009,1.72,metal); obj.location.x=x;obj.location.y=-.192;obj.rotation_euler[0]=math.pi/2
    beam('glasses_bridge',(-.035,-.195,1.72),(.035,-.195,1.72),.012,metal)
    for x in (-.14,.14):
        a.cube('professor_leg',(.18,.22,.70),(x,0,.43),metal)
        a.cube('professor_shoe',(.21,.32,.12),(x,-.06,.06),wood)
    for x in (-.31,.31): ball('professor_arm',(x,0,1.1),(.08,.10,.29),white)
    a.cube('professor_book',(.26,.07,.34),(-.28,-.15,.91),purple)

def counter():
    a.cube('canteen_counter',(2.3,.9,.90),(0,0,.45),teal,.07)
    a.cube('canteen_worktop',(2.45,1.02,.09),(0,0,.94),white,.04)
    for x in (-.72,0,.72):
        a.cube('food_tray',(.58,.58,.05),(x,0,1.02),metal,.02)
        for y in (-.15,.12): ball('bread_display',(x,y,1.11),(.22,.085,.07),cream)
    for x in (-1.05,1.05): beam('counter_signpost',(x,.35,.95),(x,.35,1.9),.05,metal)
    sign('CANTEEN',(0,.35,1.83),1.75)

def table():
    a.cube('table_top',(1.5,.8,.08),(0,0,.80),wood)
    for x in (-.55,.55):
        for y in (-.27,.27): beam('table_leg',(x,y,0),(x,y,.76),.055,metal)
    for y in (-.70,.70):
        a.cube('table_bench',(1.5,.27,.08),(0,y,.46),wood)
        for x in (-.55,.55): beam('bench_leg',(x,y,0),(x,y,.43),.05,metal)

def food(kind):
    if kind=='bread':
        ball('bread_loaf',(0,0,.13),(.35,.13,.12),cream)
        for x in (-.17,0,.17): beam('bread_score',(x,-.07,.23),(x+.04,.07,.23),.018,wood)
    elif kind=='bao':
        ball('bao_bun',(0,0,.15),(.19,.19,.15),white)
        for i in range(8):
            t=i*math.tau/8; a.tube('bao_pleat',[(math.cos(t)*.14,math.sin(t)*.14,.20),(0,0,.29)],.009,cream)
    else:
        cylinder('drink_body',.10,.32,(0,0,.19),red if kind=='soda' else blue)
        cylinder('drink_cap',.062 if kind=='water' else .1,.035,(0,0,.38),metal)
        cylinder('drink_label',.102,.13,(0,0,.20),cream)

def shed():
    a.cube('shed_body',(1.5,1.1,1.55),(0,0,.775),wood)
    for i in range(9): a.cube('shed_board_seam',(.012,.015,1.50),(-.68+i*.17,-.558,.78),metal,0)
    for side in (-1,1):
        obj=a.cube('shed_roof',(1.02,1.38,.10),(side*.40,0,1.72),teal);obj.rotation_euler[1]=side*.38
    a.cube('shed_door',(.55,.045,1.25),(-.25,-.59,.64),stone)
    ball('shed_handle',(-.08,-.63,.67),(.025,.025,.025),metal)
    sign('TOOLS',(.32,-.59,1.24),.60)

def mouse():
    ball('mouse_body',(0,0,.15),(.15,.24,.14),stone)
    ball('mouse_snout',(0,-.25,.14),(.10,.13,.09),stone)
    for x in (-.11,.11):
        ball('mouse_ear',(x,-.12,.28),(.075,.045,.09),purple)
        ball('mouse_eye',(x*.65,-.23,.21),(.018,.018,.018),metal)
    ball('mouse_nose',(0,-.37,.14),(.025,.02,.025),purple)
    a.tube('mouse_tail',[(0,.18,.12),(.11,.35,.07),(.28,.40,.03),(.34,.32,.03)],.016,purple)

PACKS = {
    'halloween': [('pumpkin',pumpkin),('gift-closed',gift),('gift-open',lambda:gift(True)),('spider',spider),('lantern',lantern),('exit-portal',portal),('dead-tree',tree),('fence',fence)],
    'khu-a': [('seed-stall',stall),('produce-stall',lambda:stall(True)),('professor',professor),('recovery-station',terminal)],
    'canteen': [('food-counter',counter),('card-machine',lambda:terminal(True)),('picnic-table',table)]+[(kind,lambda k=kind:food(k)) for kind in ('bread','bao','water','soda')],
    'community-farm': [('plot-empty',plot)]+[('plot-'+kind,lambda k=kind:plot(k)) for kind in ('carrot','tomato','corn','strawberry')]+[('mouse',mouse),('fence',fence),('tool-shed',shed)]
}

manifest={}
for pack,entries in PACKS.items():
    directory=os.path.join(BASE,pack);os.makedirs(directory,exist_ok=True)
    manifest[pack]=[]
    for name,build in entries:
        build()
        # Apply scale before export so later instances retain metre dimensions.
        for obj in bpy.context.scene.objects:
            if obj.type=='MESH':
                bpy.context.view_layer.objects.active=obj;obj.select_set(True)
                bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);obj.select_set(False)
        path=os.path.join(directory,name+'.glb')
        a.export_selected(path)
        manifest[pack].append({'file':f'{pack}/{name}.glb','name':name,'bytes':os.path.getsize(path)})

with open(os.path.join(BASE,'map-asset-packs.json'),'w',encoding='utf8') as handle:
    json.dump({'units':'metres','sourceUp':'Z','gltfUp':'Y','front':'-Y in Blender','packs':manifest},handle,indent=2)

# Reimport actual GLBs into a labelled gallery for each pack (not concept art).
for pack,entries in PACKS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for i,(name,_) in enumerate(entries):
        before=set(bpy.context.scene.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(BASE,pack,name+'.glb'))
        objects=set(bpy.context.scene.objects)-before
        parent=bpy.data.objects.new('gallery-'+name,None);bpy.context.collection.objects.link(parent)
        roots=[obj for obj in objects if obj.parent not in objects]
        for obj in roots:obj.parent=parent
        x=(i%4)*3.5; y=-(i//4)*3.5
        parent.location=(x,y,0)
        bpy.ops.object.text_add(location=(x-1.1,y-1.25,.03))
        label=bpy.context.object;label.data.body=name;label.data.size=.18
    scene=bpy.context.scene
    scene.world=bpy.data.worlds.new('Gallery world');scene.world.color=(.35,.35,.35)
    bpy.ops.object.camera_add(location=(13,-17,17))
    camera=bpy.context.object;center=Vector((5.25,-1.5,.6))
    camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=15;scene.camera=camera
    bpy.ops.object.light_add(type='AREA',location=(3,-5,12))
    bpy.context.object.data.energy=2200;bpy.context.object.data.size=9
    scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=1400;scene.render.resolution_y=950;scene.render.resolution_percentage=100
    output=os.path.join(BASE,'previews',pack+'-assets.png');os.makedirs(os.path.dirname(output),exist_ok=True)
    scene.render.filepath=output;bpy.ops.render.render(write_still=True)
print('ASSET PACKS COMPLETE:',sum(len(p) for p in PACKS.values()),'GLB files')
