"""Build editable private-garden GLBs and a reusable detailed modular student.
Blender --background --python tools/build_private_bench.py [-- --only=bench|characters]
Geometry is authored in metres, Z-up, front -Y. No game labels baked into meshes.
"""
import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asset_modeling import *
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
SOURCE=os.path.join(ROOT,'source-assets/private-bench-v1')
OUT=os.path.join(ROOT,'client/assets/3d/private-bench-v1')
CHARS=os.path.join(ROOT,'client/assets/3d/characters/private-garden-v1')
ONLY=next((s.split('=',1)[1] for s in sys.argv if s.startswith('--only=')),None)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.unit_settings.system='METRIC'
M={
 'wood':textured('Private garden honey oak',(.46,.235,.085)),
 'woodlight':textured('Private garden oak highlights',(.61,.36,.16)),
 'wooddark':textured('Private garden oak endgrain',(.26,.12,.04)),
 'stone':textured('Private garden warm limestone',(.75,.66,.49),'stone'),
 'stonepale':textured('Private garden limestone cap',(.86,.78,.62),'stone'),
 'soil':textured('Private garden earth',(.10,.05,.025),'earth'),
 'teal':material('Private garden teal enamel',(.025,.11,.105),.40,.5),
 'bronze':material('Private garden aged brass',(.54,.30,.10),.38,.65),
 'glass':material('Private garden amber glass',(.98,.68,.24),.35,emission=.7),
 'base':textured('Private garden portal charcoal',(.075,.095,.10),'stone'),
 'cyan':material('Private garden cyan crystal',(.025,.65,.85),.22,.25,1.0),
 'tile':textured('Private garden cream pavers',(.71,.62,.48),'stone'),
 'terracotta':textured('Private garden terracotta border',(.46,.24,.14),'stone'),
 'grass':material('Private garden lawn',(.20,.35,.09),.95),
 'pink':material('Private garden pink petals',(.81,.25,.38)),
 'pinklight':material('Private garden blush petals',(.94,.48,.59)),
 'white':material('Private garden ivory petals',(.93,.88,.72)),
 'pollen':material('Private garden flower centres',(.83,.63,.20))
}
GREENS=[material('Private garden foliage '+str(i),c,.85) for i,c in enumerate([(.08,.21,.025),(.15,.32,.035),(.27,.43,.06),(.39,.53,.10)])]
records=[]

def group(name,fn):
    before=set(bpy.context.scene.objects);fn()
    objs=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
    return batch(name,objs) if objs else None

def leaves(name,entries):
    """Consolidated curved double-sided leaves; no thousands of Blender objects."""
    verts=[];faces=[]
    for center,angle,length,width,tilt in entries:
        p=Vector(center);axis=Vector((math.cos(angle),math.sin(angle),tilt)).normalized()*length
        side=Vector((-math.sin(angle),math.cos(angle),0))*width
        n=len(verts)
        for t,s in [(0,0),(.28,-.70),(.62,-1),(1,0),(.62,1),(.28,.70),(.48,0)]:
            verts.append(tuple(p+axis*t+side*s+Vector((0,0,math.sin(t*math.pi)*.035))))
        for i in range(6):faces.append((n+6,n+i,n+(i+1)%6))
    o=mesh(name,verts,faces,GREENS[1],False)
    for mat in [GREENS[0],GREENS[2],GREENS[3]]:o.data.materials.append(mat)
    rng=random.Random(27)
    for i in range(len(entries)):
        mi=rng.choices([0,1,2,3],[4,2,4,1])[0]
        for p in o.data.polygons[i*6:i*6+6]:p.material_index=mi
    for mat in o.data.materials:mat.use_backface_culling=False
    return o

def flower_cloud(centers,seed=32):
    rng=random.Random(seed);verts=[];faces=[];mi=[]
    for k,(cx,cy,cz,r) in enumerate(centers):
        for j in range(32):
            a=j*2.399963;u=(j+.5)/32;rho=r*math.sqrt(1-u*u)
            center=Vector((cx+math.cos(a)*rho,cy+math.sin(a)*rho,cz+r*u*.65))
            normal=Vector((math.cos(a)*.55,math.sin(a)*.55,.85)).normalized()
            tangent=normal.cross(Vector((0,1,0))).normalized();bitangent=normal.cross(tangent)
            flower_color=k%3
            for petal in range(4):
                angle=petal*math.pi/2+rng.random()*.12
                axis=tangent*math.cos(angle)+bitangent*math.sin(angle)
                across=normal.cross(axis);n=len(verts)
                for t,s,h in [(0,0,0),(.35,-.7,0),(.85,-.65,-.1),(1,0,-.16),(.85,.65,-.1),(.35,.7,0),(.55,0,.12)]:
                    verts.append(tuple(center+axis*(t*.065)+across*(s*.047)+normal*(h*.06)))
                for p in range(6):faces.append((n+6,n+p,n+(p+1)%6));mi.append(flower_color)
    o=mesh('hydrangea_petal_clusters',verts,faces,M['pink'],True)
    for mat in [M['white'],M['pinklight']]:o.data.materials.append(mat)
    for p,index in zip(o.data.polygons,mi):p.material_index=index
    entries=[]
    for cx,cy,cz,r in centers:
        for i in range(7):
            a=i*math.tau/7;entries.append(((cx+math.cos(a)*r*.35,cy+math.sin(a)*r*.35,cz-.10),a,.30,.105,.2))
    leaves('hydrangea_leaves',entries)

def pergola():
    for x in [-1.68,1.68]:
        for y in [-1.03,1.03]:
            box('pergola_foot',(.38,.38,.12),(x,y,.06),M['stonepale'],.025)
            box('pergola_pedestal',(.29,.29,.34),(x,y,.29),M['stone'],.018)
            box('pergola_cap',(.37,.37,.10),(x,y,.51),M['stonepale'],.02)
            box('pergola_post',(.19,.19,2.12),(x,y,1.61),M['wood'],.014)
            for dx in [-1,1]:beam('pergola_brace',(x,y,2.13),(x+dx*.40,y,2.57),.095,.13,M['woodlight'])
    for y in [-1.03,1.03]:
        box('pergola_main_beam',(3.85,.16,.21),(0,y,2.63),M['wood'],.012)
        box('pergola_beam_cap',(3.98,.21,.045),(0,y,2.755),M['woodlight'],.012)
    for i in range(9):box('pergola_roof_slat',(.105,2.65,.12),(-1.68+i*.42,0,2.79),M['woodlight'],.012)
    entries=[];rng=random.Random(7)
    for x in [-1.68,1.68]:
        for y in [.98]:
            points=[(x+.045*math.sin(i*.8),y+.04*math.cos(i*.9),.50+i*.13) for i in range(18)]
            tube('pergola_climbing_vine',points,.014,GREENS[0],7)
            for i in range(35):
                z=.65+i*.057;entries.append(((x+rng.uniform(-.12,.12),y-.03,z),rng.uniform(-math.pi,math.pi),.21,.08,.35))
    for i in range(130):
        x=rng.uniform(-1.85,1.85);y=rng.choice([-1.03,1.03])+rng.uniform(-.13,.13)
        entries.append(((x,y,2.80+rng.uniform(0,.03)),rng.uniform(0,math.tau),.23,.10,rng.uniform(-.7,.5)))
    leaves('pergola_vine_leaves',entries)

def bench():
    # Sculpted solid stone side profiles; front is -Y, no middle support.
    profile=[(-.39,0),(.35,0),(.35,.91),(.27,.98),(.18,.96),(.12,.73),(.04,.64),(-.28,.64),(-.39,.58)]
    for x in [-.99,.99]:
        vs=[(x+dx,y,z) for dx in [-.085,.085] for y,z in profile];n=len(profile)
        fs=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        o=mesh('bench_stone_side',vs,fs,M['stone'],False)
        mod=o.modifiers.new('Rounded stone edge','BEVEL');mod.width=.028;mod.segments=3
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        box('bench_stone_foot',(.25,.80,.08),(x,-.015,.04),M['stonepale'],.025)
        box('bench_armrest_cap',(.21,.61,.07),(x,-.07,.64),M['stonepale'],.03)
    for i in range(4):box('bench_seat_slat',(1.86,.137,.055),(0,-.225+i*.15,.4325),M['wood'],.012)
    for i in range(4):
        z=.56+i*.106;y=.245+(z-.56)*.17
        o=box('bench_back_slat',(1.86,.055,.089),(0,y,z),M['wood'],.012);o.rotation_euler.x=-.17
    for x in [-.70,.70]:
        box('bench_back_brace',(.065,.065,.50),(x,.335,.68),M['wooddark'],.008)
        box('bench_under_brace',(.065,.60,.065),(x,0,.36),M['wooddark'],.008)
        for z in [.57,.89]:sphere('bench_brass_bolt',(x,.296,z),(.014,.010,.014),M['bronze'],10,6)

def tree():
    rng=random.Random(31)
    tube('tree_main_trunk',[(0,0,0),(.04,.02,.65),(-.07,0,1.45),(.01,.02,2.30),(-.15,0,3.25)],[.25,.22,.18,.13,.045],M['wooddark'],12,True)
    clusters=[]
    for i in range(8):
        a=i*2.39996;tip=Vector((math.cos(a)*1.35,math.sin(a)*1.25,3.05+(i%3)*.34))
        tube('tree_branch',[(0,0,1.5+(i%2)*.4),tuple(tip*.63+Vector((0,0,.2))),tuple(tip)],[.13,.075,.018],M['wooddark'],9,True)
        clusters.append(tip+Vector((0,0,.35)))
    entries=[]
    for k,c in enumerate(clusters+[Vector((0,0,4.15))]):
        # Low-cost inner leafy volume supports silhouette; leaf shells supply fine edges.
        sphere('tree_inner_canopy',c,(.81,.77,.56),GREENS[k%3],16,10)
        for i in range(100):
            a=i*2.39996;u=1-2*(i+.5)/100;r=math.sqrt(1-u*u)
            p=c+Vector((math.cos(a)*r*.94,math.sin(a)*r*.9,u*.65))
            entries.append((p,a+rng.random(),.27+rng.random()*.14,.10+rng.random()*.04,u*.5))
    leaves('tree_leaf_shell',entries)

def lamp():
    lathe('lamp_base',[(0,.19),(.07,.19),(.10,.145),(.21,.13),(.32,.095),(.45,.075)],M['teal'])
    lathe('lamp_pole',[(.30,.075),(2.13,.045),(2.20,.08),(2.23,.075)],M['teal'],16)
    for z in [.20,.40,2.15,2.24]:torus('lamp_brass_ring',.075 if z>.3 else .13,.012,(0,0,z),M['bronze'])
    box('lamp_glass',(.21,.21,.39),(0,0,2.45),M['glass'],.014)
    for x in [-.125,.125]:
        for y in [-.125,.125]:beam('lamp_corner',(x*.73,y*.73,2.23),(x,y,2.66),.022,.022,M['teal'],.004)
    lathe('lamp_roof',[(2.65,.205),(2.68,.215),(2.75,.13),(2.82,.045),(2.86,.013)],M['teal'],4)
    sphere('lamp_finial',(0,0,2.89),(.035,.035,.055),M['teal'],12,8)

def urn():
    box('urn_plinth',(.62,.62,.10),(0,0,.05),M['stonepale'],.018)
    box('urn_pedestal',(.49,.49,.42),(0,0,.31),M['stone'],.018)
    box('urn_cap',(.61,.61,.09),(0,0,.565),M['stonepale'],.016)
    lathe('urn_stem',[(.61,.20),(.65,.20),(.69,.12),(.76,.12),(.78,.17)],M['stonepale'])
    lathe('urn_bowl',[(.75,.14),(.80,.27),(.90,.38),(1.02,.43),(1.06,.44)],M['stonepale'],40)
    for i in range(16):
        a=i*math.tau/16;tube('urn_flute',[(math.cos(a)*.17,math.sin(a)*.17,.78),(math.cos(a)*.34,math.sin(a)*.34,.89),(math.cos(a)*.415,math.sin(a)*.415,1.02)],.018,M['stone'],7,True)
    torus('urn_lip',.432,.029,(0,0,1.05),M['stonepale'])
    cylinder('urn_soil',.401,.035,(0,0,1.028),M['soil'])
    centers=[(math.cos(i*2.4)*.24,math.sin(i*2.4)*.24,1.13+(i%2)*.04,.16) for i in range(7)]
    flower_cloud(centers)

def flowerbed():
    for i in range(18):
        a=i*math.tau/18;a2=(i+1)*math.tau/18-.012;a1=a+.012
        vs=[(r*math.cos(t),r*math.sin(t),z) for z in [0,.22] for r in [.73,.88] for t in [a1,(a1+a2)/2,a2]]
        fs=[]
        for j in range(2):fs.extend([(j,j+1,4+j,3+j),(6+j,9+j,10+j,7+j),(j,6+j,7+j,j+1),(3+j,4+j,10+j,9+j)])
        fs.extend([(0,3,9,6),(2,8,11,5)])
        mesh('flowerbed_curved_stone',vs,fs,M['stonepale'],False)
    cylinder('flowerbed_soil',.74,.15,(0,0,.075),M['soil'],48)
    centers=[(math.cos(i*2.4)*(.45 if i else 0),math.sin(i*2.4)*(.45 if i else 0),.29+(i%3)*.03,.22) for i in range(10)]
    flower_cloud(centers,14)

def hedge():
    box('hedge_inner', (2,.55,.62),(0,0,.35),GREENS[0],.14)
    rng=random.Random(46);entries=[]
    for i in range(340):
        x=rng.uniform(-.99,.99);z=rng.uniform(.08,.77);side=rng.choice([-1,1]);y=side*.27
        if i%3==0:z=.76;y=rng.uniform(-.27,.27)
        entries.append(((x,y,z),rng.uniform(0,math.tau),.17,.07,rng.uniform(-.3,.5)))
    leaves('hedge_outer_leaves',entries)

def portal():
    cylinder('portal_plinth',.90,.15,(0,0,.075),M['base'],48)
    cylinder('portal_step',.81,.10,(0,0,.20),M['base'],48)
    torus('portal_threshold',.71,.012,(0,0,.255),M['cyan'])
    pts=[(.66*math.cos(i*math.tau/64),0,1.22+.93*math.sin(i*math.tau/64)) for i in range(65)]
    tube('portal_oval_arch',pts,.068,M['bronze'],10)
    tube('portal_inner_edge',[(x*.94,y-.014,1.22+(z-1.22)*.96) for x,y,z in pts],.023,M['cyan'],8)
    for x in [-.65,.65]:
        lathe('portal_support',[(.25,.13),(.30,.14),(.37,.09),(.88,.052)],M['teal'],8).location.x=x
    for x,z in [(0,2.20),(-.66,.86),(.66,.86)]:
        o=sphere('portal_diamond',(x,-.04,z),(.09,.075,.15),M['cyan'],4,2);o.rotation_euler.y=math.pi/4

def paving():
    for j in range(5):
        for i in range(4):box('path_cream_tile',(.295,.394,.055),(-.45+i*.30,-.8+j*.4,.0025),M['tile'],.005)
    for x in [-.675,.675]:
        for j in range(5):box('path_border_tile',(.145,.394,.055),(x,-.8+j*.4,.0025),M['terracotta'],.004)

def ground():
    box('garden_lawn',(12,10,.12),(0,0,-.08),M['grass'],.04)
    # A single mesh of individual pavers: central loop, pergola approach, portal branch.
    def paver(x,y,sx,sy,border=False,height=.012):box('garden_paving', (sx-.008,sy-.008,.05),(x,y,height),M['terracotta'] if border else M['tile'],.004)
    for j in range(30):
        y=-4.85+j*.30
        for i in range(5):
            x=(i-2)*.30;r=math.hypot(x,y+.30)
            if r>1.66 or y>1.25:paver(x,y,.30,.30,i in [0,4])
    for ring in range(4):
        r=1.0+ring*.28;n=64
        for i in range(n):
            a=i*math.tau/n
            # Curved annulus sectors, not boxes intersecting the central bed.
            vs=[(rr*math.cos(t),-.30+rr*math.sin(t),z) for z in [-.019,.031] for rr in [r-.135,r+.135] for t in [a+.002,a+math.tau/n-.002]]
            fs=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
            mesh('garden_loop_paver',vs,fs,M['terracotta'] if ring in [0,3] else M['tile'],False)
    for j in range(12):
        x=.83+j*.30
        for i in range(4):paver(x,-3+(i-1.5)*.30,.30,.30,i in [0,3],height=.018)

def save(name,fn):
    fn();rec=export_asset(os.path.join(OUT,name+'.glb'),True,os.path.join(SOURCE,'models',name+'.blend'))
    rec.update({'id':name,'front':'Blender -Y','origin':'ground centre'});records.append(rec);print('PRIVATE ASSET',name,rec['bytes'],flush=True)

builders=[('pergola',pergola),('bench',bench),('tree',tree),('lamp',lamp),('flower-urn',urn),('flowerbed',flowerbed),('hedge',hedge),('exit-portal',portal),('paving',paving),('garden-ground',ground)]
for name,fn in builders:
    if ONLY not in [None,name]:continue
    save(name,fn)
if records:
    path=os.path.join(OUT,'manifest.json')
    if ONLY and os.path.exists(path):
        previous=json.load(open(path,encoding='utf8'))['assets'];records=[a for a in previous if a['id']!=ONLY]+records
    with open(path,'w',encoding='utf8') as f:json.dump({'version':1,'units':'metres','reference':'source-assets/private-bench-v1/references/00-approved-perspective.png','assets':records},f,indent=2,ensure_ascii=False)
if ONLY and ONLY!='characters':sys.exit(0)

def clone_tree(obj,parent=None,suffix=''):
    copy=obj.copy()
    if obj.type=='MESH':copy.data=obj.data.copy()
    bpy.context.collection.objects.link(copy);copy.name=obj.name+suffix;copy.parent=parent
    copy.matrix_basis=obj.matrix_basis.copy()
    for child in obj.children:clone_tree(child,copy,suffix)
    return copy

def make_character(preset=None):
    path=os.path.join(ROOT,'source-assets/characters/student-male-01.blend')
    with bpy.data.libraries.load(path,link=False) as (src,dst):dst.objects=list(src.objects)
    for obj in dst.objects:
        if obj: bpy.context.collection.objects.link(obj)
    body=bpy.data.objects.get('student_body');head=bpy.data.objects.get('student_head_mount')
    assert body and head,'The detailed student source/rig is required'
    # Extract fabric faces into replaceable outfit branches, retaining skin and trousers.
    for obj in list(bpy.context.scene.objects):
        if obj.type!='MESH':continue
        material_names=[m.name.split('.')[0:2] for m in obj.data.materials]
        is_fabric=lambda m:m and (m.name.startswith('char.shirt') or m.name.startswith('char.trim') or (obj.parent==body and m.name.startswith('char.shoes-ivory')))
        indices={i for i,m in enumerate(obj.data.materials) if is_fabric(m)}
        if not indices:continue
        part='torso' if obj.parent==body else obj.parent.name.removeprefix('student_')
        anchor=empty('module__outfit__polo__'+part,parent=obj.parent)
        duplicate=obj.copy();duplicate.data=obj.data.copy();bpy.context.collection.objects.link(duplicate);parent_keep(duplicate,anchor)
        for target,remove_selected in [(obj,True),(duplicate,False)]:
            bm=bmesh.new();bm.from_mesh(target.data)
            remove=[face for face in bm.faces if (face.material_index in indices)==remove_selected]
            bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(target.data);bm.free();target.data.update()
        if not obj.data.polygons:bpy.data.objects.remove(obj,do_unlink=True)
        for option in ['apron','vest']:
            branch=clone_tree(anchor,anchor.parent,'_'+option);branch.name='module__outfit__'+option+'__'+part
            cream=material('char.'+option+'.shirt',(.82,.78,.66))
            for child in branch.children_recursive:
                if child.type=='MESH':
                    for i,m in enumerate(child.data.materials):
                        if m and m.name.startswith('char.shirt'):child.data.materials[i]=cream
    for option in ['apron','vest']:
        node=next(o for o in bpy.context.scene.objects if o.name=='module__outfit__'+option+'__torso')
        before=set(bpy.context.scene.objects)
        if option=='apron':
            mat=material('char.private.apron',(.06,.16,.22));box('apron_front',(.30,.025,.40),(0,-.116,.98),mat,.02)
            box('apron_pocket',(.19,.018,.10),(0,-.135,.91),mat,.012)
        else:
            mat=material('char.private.vest',(.18,.12,.07))
            for s in [-1,1]:box('vest_panel',(.125,.023,.29),(s*.10,-.113,1.11),mat,.02)
        for o in set(bpy.context.scene.objects)-before:parent_keep(o,node)
    hair=bpy.data.objects.get('student_hair');hair.name='module__hair__wavy__head'
    for option in ['braid','gray']:
        branch=clone_tree(hair,hair.parent,'_'+option);branch.name='module__hair__'+option+'__head'
        if option=='gray':
            grey=material('char.private.gray',(.28,.29,.28))
            for child in branch.children_recursive:
                if child.type=='MESH':
                    for i,m in enumerate(child.data.materials):
                        if m and m.name.startswith('char.hair'):child.data.materials[i]=grey
        else:
            for i in range(6):parent_keep(sphere('braid_lock',(0,.135+i*.008,1.60-i*.055),(.039,.045,.045),bpy.data.materials.get('char.hair'),12,8),branch)
    glasses=empty('module__accessory__glasses__head',parent=head)
    for x in [-.055,.055]:parent_keep(torus('glasses_rim',.037,.0045,(x,-.145,1.555),M['teal'],True),glasses)
    parent_keep(beam('glasses_bridge',(-.018,-.145,1.555),(.018,-.145,1.555),.005,.005,M['teal']),glasses)
    backpack=empty('module__accessory__backpack__body',parent=body)
    parent_keep(box('student_backpack',(.26,.14,.32),(0,.17,1.12),M['teal'],.04),backpack)
    parent_keep(box('backpack_pocket',(.19,.03,.12),(0,.25,1.04),M['woodlight'],.015),backpack)
    for s in [-1,1]:parent_keep(beam('backpack_strap',(s*.13,.10,1.31),(s*.13,.12,.98),.025,.02,M['wooddark']),backpack)
    for m in bpy.data.materials:
        if m.name.startswith('char.shoes') and not m.name.startswith('char.shoes-ivory'):
            m.diffuse_color=(.18,.20,.19,1)
            if m.use_nodes:m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.18,.20,.19,1)
    if preset:
        for obj in [o for o in bpy.context.scene.objects if o.type=='EMPTY' and o.name.startswith('module__')]:
            _,slot,option,*_=obj.name.split('__')
            keep=option in preset['accessories'] if slot=='accessory' else preset[slot]==option
            if not keep:
                for child in list(obj.children_recursive):bpy.data.objects.remove(child,do_unlink=True)
                bpy.data.objects.remove(obj,do_unlink=True)

chars=[]
for name,preset in [('modular-student',None),('student-polo',{'hair':'wavy','outfit':'polo','accessories':[]})]:
    make_character(preset)
    rec=export_asset(os.path.join(CHARS,name+'.glb'),False,os.path.join(SOURCE,'characters',name+'.blend'))
    rec.update({'id':name,'heightMetres':1.78,'jointContract':'student-animation-v1','moduleNaming':'module__slot__option__part','front':'Blender -Y','preset':preset})
    chars.append(rec);print('PRIVATE CHARACTER',name,rec['bytes'],flush=True)
with open(os.path.join(CHARS,'manifest.json'),'w',encoding='utf8') as f:
    json.dump({'version':1,'units':'metres','rig':'student-animation-v1','slots':{'hair':['wavy','braid','gray'],'outfit':['polo','apron','vest'],'accessories':['backpack','glasses']},'assets':chars},f,ensure_ascii=False,indent=2)
print('PRIVATE GARDEN BUILD COMPLETE',flush=True)
