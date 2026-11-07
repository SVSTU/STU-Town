"""Build the community garden's reference-matched, reusable GLB modules.
blender --background --python tools/build_community_garden.py [-- --only=raised-bed,...]
No gameplay state is authored into these assets; crops, signs and portal VFX are separate.
"""
import bpy,math,os,sys,json,random
from mathutils import Vector
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from asset_modeling import *
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
OUT=os.path.join(ROOT,'client','assets','3d','community-farm-v2')
bpy.ops.wm.read_factory_settings(use_empty=True)
wood=textured('Garden honey oak',(.45,.215,.070))
oaklight=textured('Garden oak highlights',(.61,.33,.12))
wooddark=textured('Garden oak endgrain',(.29,.12,.035))
soil=textured('Rich tilled earth',(.105,.047,.022),'earth')
stone=[textured('Warm limestone '+str(i),c,'stone') for i,c in enumerate([(.66,.54,.36),(.78,.68,.50),(.86,.77,.60),(.73,.61,.43)])]
iron=material('Aged dark iron',(.10,.12,.115),.46,.6)
silver=material('Galvanized silver',(.48,.52,.49),.38,.65)
gold=material('Warm brass',(.64,.35,.06),.35,.65)
teal=material('Garden teal enamel',(.028,.22,.18),.46)
roofmats=[material('Teal roof '+str(i),c,.85) for i,c in enumerate([(.06,.20,.17),(.09,.28,.24),(.13,.31,.26)])]
greens=[textured('Leaf green '+str(i),c,'leaf') for i,c in enumerate([(.08,.25,.025),(.14,.36,.035),(.26,.43,.055),(.34,.49,.08)])]
wilt=material('Wilted leaf',(.30,.20,.055),.95)
pink=material('Pink petals',(.78,.19,.35),.8);lavender=material('Lavender petals',(.49,.25,.64),.8)
white=material('Ivory petals',(.91,.86,.71),.75);yellow=material('Golden pollen',(.88,.53,.035),.7)
red=material('Tomato red',(.68,.055,.023),.4);berry=material('Strawberry red',(.65,.025,.02),.46)
seedmat=material('Strawberry seeds',(.76,.48,.10),.7)
amber=material('Lantern amber',(.98,.55,.14),.35,0,2)
cyan=material('Portal cyan energy',(.02,.65,.82),.25,0,2.2)
watermat=material('Water in barrel',(.025,.27,.32),.19,.15)

def move_group(before,position,scale=1,rotation=0):
    group=set(bpy.context.scene.objects)-before
    # No parenting in these plant kits; apply the same rigid transform to all pieces.
    c,s=math.cos(rotation),math.sin(rotation)
    for o in group:
        p=o.location*scale;o.location=(position[0]+p.x*c-p.y*s,position[1]+p.x*s+p.y*c,position[2]+p.z)
        o.scale*=scale;o.rotation_euler.z+=rotation

def bolt(x,y,z,mat=gold):return sphere('brass_fastener',(x,y,z),(.018,.012,.018),mat,12,8)

def raised_bed():
    for x in [-1.73,1.73]:
        for y in [-1.13,1.13]:
            box('bed_corner_post',(.14,.14,.49),(x,y,.245),oaklight,.025)
            box('bed_post_cap',(.17,.17,.035),(x,y,.49),oaklight,.016)
    for z in [.12,.32]:
        for y in [-1.135,1.135]:
            box('bed_long_plank',(3.46,.10,.195),(0,y,z),wood,.018)
            for x in [-1.60,1.60]:bolt(x,y+math.copysign(.059,y),z)
        for x in [-1.735,1.735]:box('bed_end_plank',(.10,2.18,.195),(x,0,z),wood,.018)
    for x in [-1.05,0,1.05]:box('bed_floor_brace',(.13,2.23,.075),(x,0,.05),wooddark,.01)
    for i in range(8):box('bed_base_plank',(.41,2.24,.04),(-1.47+i*.42,0,.09),wooddark,.008)
    nx,ny=36,24;verts=[];rng=random.Random(32)
    for j in range(ny+1):
        for i in range(nx+1):
            x=-1.65+i*3.3/nx;y=-1.05+j*2.1/ny
            z=.405+.012*math.sin(y*34)+rng.uniform(-.006,.006)
            verts.append((x,y,z))
    faces=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(ny) for i in range(nx)]
    mesh('bed_tilled_soil',verts,faces,soil)

def plot_sign():
    box('plot_sign_post',(.055,.055,.65),(0,.02,.325),wood,.008)
    box('plot_blank_plaque',(.80,.055,.24),(0,-.025,.56),oaklight,.055)
    for x in [-.33,.33]:bolt(x,-.061,.63,iron)

def carrot(stage):
    ripe=stage=='ripe';dead=stage=='wilted';leafmat=wilt if dead else greens[1]
    if stage!='growing':
        carrotmat=material('Carrot orange',(.85,.24,.025),.65)
        root=lathe('carrot_root',[(-.30,.005),(-.25,.022),(-.15,.047),(-.035,.065),(.035,.071),(.065,.055)],carrotmat,24)
        for z in [-.21,-.14,-.06,.01]:
            torus('carrot_skin_line',.025+(z+.21)*.17,.0018,(0,0,z),wooddark)
    for i in range(7 if ripe else 4):
        angle=i*2.39996;end=Vector((math.cos(angle)*.20,math.sin(angle)*.20,.35 if not dead else .13))
        tube('carrot_stem',[(0,0,.015),tuple(end*.5+Vector((0,0,.07))),tuple(end)],.004,leafmat,6)
        for j in range(3):
            p=end*(.45+j*.18);p.z+=.04
            for side in [-1,1]:
                d=Vector((math.cos(angle+side*.8),math.sin(angle+side*.8),.5))*.12
                leaf('carrot_leaf',p,p+d,.027,leafmat,lobes=5,bend=.018)

def tomato(stage):
    small=stage=='growing';dead=stage=='wilted';height=.35 if small else .95;mat=wilt if dead else greens[0]
    tube('tomato_stalk',[(0,0,0),(.015,0,height*.5),(-.02,.01,height)],[.016,.010,.004],mat,10)
    if not small:
        cylinder('tomato_stake',.018,1.03,(.045,.045,.515),wood,12)
        for z in [.27,.53,.76]:torus('tomato_twine',.052,.004,(.01,.015,z),wooddark)
    for i in range(5 if small else 9):
        t=i*2.39996;z=height*(.25+i/(7 if small else 12));spread=.12 if small else .25
        p=Vector((0,0,z));end=p+Vector((math.cos(t)*spread,math.sin(t)*spread,.06 if not dead else -.15))
        tube('tomato_branch',[tuple(p),tuple(p.lerp(end,.5)+Vector((0,0,.035))),tuple(end)],.004 if small else .008,mat,7)
        for j in range(3):
            start=p.lerp(end,.3+j*.22)
            for side in [-1,1]:
                d=Vector((math.cos(t+side*.7),math.sin(t+side*.7),.2 if not dead else -.5))*(.11 if small else .17)
                leaf('tomato_leaf',start,start+d,.035 if small else .052,mat,lobes=4,bend=.02)
        if not small and i<(1 if dead else 7):
            fruit=end+Vector((0,0,-.065));sphere('tomato_fruit',fruit,(.071,.069,.064),red,24,14)
            for j in range(5):
                u=j*math.tau/5;leaf('tomato_sepal',fruit+Vector((0,0,.057)),fruit+Vector((math.cos(u)*.055,math.sin(u)*.055,.065)),.012,greens[0],bend=.007)

def corn(stage):
    small=stage=='growing';dead=stage=='wilted';height=.45 if small else 1.67;mat=wilt if dead else greens[1]
    tube('corn_stalk',[(0,0,0),(.015,.01,height*.5),(0,0,height)],[.022,.017,.004],mat,12)
    for i in range(4 if small else 9):
        t=i*2.39996;z=height*(.15+i/(7 if small else 12));length=.23 if small else .50
        tip=Vector((math.cos(t)*length,math.sin(t)*length,z+(0 if dead else .14)))
        leaf('corn_leaf',(0,0,z),tip,.045 if small else .075,mat,bend=-.12 if dead else .12,rows=16)
    if not small:
        for i in range(1 if dead else 2):
            t=-.8+i*math.pi;before=set(bpy.context.scene.objects)
            cob=lathe('corn_cob',[(0,.016),(.035,.038),(.12,.043),(.23,.031),(.28,.006)],yellow,20)
            for row in range(11):
                z=.025+row*.022;r=.031*math.sin((row+1)/13*math.pi)**.4
                for j in range(9):
                    u=j*math.tau/9;sphere('corn_kernel',(math.cos(u)*r,math.sin(u)*r,z),(.010,.010,.012),yellow,8,6)
            for j in range(3):
                u=j*2.1;leaf('corn_husk',(0,0,0),(.11*math.cos(u),.11*math.sin(u),.27),.033,mat,bend=.02)
            move_group(before,(math.cos(t)*.10,math.sin(t)*.10,.67+i*.35),1,t)
        for i in range(7):
            t=i*math.tau/7;tube('corn_tassel',[(0,0,height-.08),(.06*math.cos(t),.06*math.sin(t),height+.03),(.12*math.cos(t),.12*math.sin(t),height+.09)],[.006,.004,.001],yellow,6)

def strawberry_fruit(pos):
    before=set(bpy.context.scene.objects)
    lathe('strawberry_fruit',[(0,.004),(.03,.028),(.07,.049),(.11,.051),(.14,.035),(.15,.008)],berry,24)
    for row in range(5):
        z=.025+row*.023;r=.025+.022*math.sin(row/5*math.pi)
        for j in range(8):
            a=j*math.tau/8+row*.3;sphere('strawberry_seed',(math.cos(a)*r,math.sin(a)*r,z),(.0025,.0025,.004),seedmat,8,6)
    for j in range(5):
        a=j*math.tau/5;leaf('strawberry_calyx',(0,0,.14),(.065*math.cos(a),.065*math.sin(a),.154),.016,greens[0],bend=.01)
    move_group(before,pos)

def flower(pos,color=white,size=1,cheap=False):
    before=set(bpy.context.scene.objects)
    for i in range(5):
        a=i*math.tau/5
        if cheap:
            verts=[(0,0,.007)]+[(math.cos(j*math.tau/10)*.029,math.sin(j*math.tau/10)*.017,0) for j in range(10)]
            o=mesh('flower_petal',verts,[(0,j+1,(j+1)%10+1) for j in range(10)],color);o.location=(.028*math.cos(a),.028*math.sin(a),0)
        else:o=sphere('flower_petal',(.028*math.cos(a),.028*math.sin(a),0),(.029,.017,.009),color,12,8)
        o.rotation_euler.z=a
    sphere('flower_pollen',(0,0,.008),(.014,.014,.009),yellow,8 if cheap else 12,6 if cheap else 8)
    move_group(before,pos,size)

def strawberry(stage):
    small=stage=='growing';dead=stage=='wilted';mat=wilt if dead else greens[1]
    for i in range(4 if small else 9):
        a=i*2.39996;r=.13 if small else .22;h=.12 if small else (.12 if dead else .25)
        end=Vector((math.cos(a)*r,math.sin(a)*r,h))
        tube('strawberry_stem',[(0,0,.01),tuple(end)],.003 if small else .005,mat,7)
        for j in [-1,0,1]:
            u=a+j*.7;leaf('strawberry_leaf',end,end+Vector((math.cos(u)*.11,math.sin(u)*.11,.035 if not dead else -.09)),.055 if not small else .035,mat,lobes=7,bend=.02)
        if not small and i<(1 if dead else 5):strawberry_fruit((end.x*1.2,end.y*1.2,.025))
        if not small and not dead and i in [5,7]:flower((end.x*.8,end.y*.8,.32),white,.85)

def crop(kind,stage):globals()[kind](stage)

def tool_shed():
    # Individual siding and staggered roof shingles preserve the reference silhouette.
    box('shed_dark_interior',(2.45,1.75,2.05),(0,0,1.13),wooddark,.03)
    for i in range(11):
        z=.22+i*.18
        for y in [-.91,.91]:box('shed_siding',(2.55,.06,.173),(0,y,z),wood,.012)
        for x in [-1.26,1.26]:box('shed_side_siding',(.06,1.82,.173),(x,0,z),wood,.012)
    for x in [-1.24,1.24]:
        for y in [-.90,.90]:box('shed_corner_pier',(.12,.13,2.22),(x,y,1.15),oaklight,.018)
    for x in [-.92,-.48,-.04]:box('shed_door_plank',(.42,.075,1.85),(x,-.967,1.05),wood,.015)
    for x in [-1.14,.16]:box('shed_door_frame',(.10,.12,2.02),(x,-.98,1.10),oaklight,.012)
    for z in [.47,1.67]:
        box('shed_hinge',(.20,.025,.055),(-1.05,-1.02,z),iron,.008)
        bolt(-1.10,-1.04,z,iron)
    box('shed_latch',(.11,.03,.04),(.045,-1.027,1.12),iron,.01)
    # Open shelf cabinet is a separate protruding object, not painted onto a wall.
    for x in [.28,1.10]:box('shed_shelf_side',(.09,.46,1.87),(x,-1.02,1.10),wood,.014)
    for z in [.28,.67,1.07,1.48,1.93]:box('shed_shelf',(.86,.48,.07),(.69,-1.03,z),oaklight,.012)
    for z in [.74,1.15,1.56]:
        for x in [.48,.88]:
            pot=lathe('shed_terracotta_pot',[(0,.07),(.15,.105),(.17,.11)],wooddark,16);pot.location=(x,-1.02,z)
    # Gable and roof cover an exactly matching pitched profile.
    for y in [-.94,.94]:
        mesh('shed_gable',[(-1.27,y,2.08),(1.27,y,2.08),(0,y,2.83)],[(0,1,2)],wood)
    slope=math.atan2(.77,1.46)
    for s in [-1,1]:
        for row in range(6):
            x=s*(.12+row*.245);z=2.84-abs(x)*.527
            for col in range(8):
                tile=box('shed_roof_shingle',(.31,.28,.055),(x,-1.02+col*.29+(row%2)*.035,z),roofmats[(row+col)%3],.025);tile.rotation_euler.y=s*slope
        beam('shed_front_fascia',(0,-1.13,2.88),(s*1.53,-1.13,2.05),.10,.10,oaklight)
    for j in range(8):
        ridge=box('shed_ridge_tile',(.21,.30,.08),(0,-1.03+j*.295,2.91),roofmats[1],.035)
    for x in [-1.05,-.35,.35,1.05]:box('shed_foundation',(.69,2.02,.18),(x,0,.09),stone[0],.045)
    # Tool rack, spade, fork, shovel and warm lantern.
    box('tool_rack',(.96,.07,.09),(-.51,-1.04,1.59),oaklight,.015)
    for i,x in enumerate([-.86,-.51,-.17]):
        cylinder('tool_handle',.018,.64,(x,-1.09,1.24),oaklight,12)
        torus('tool_handle_loop',.052,.012,(x,-1.09,1.60),silver,True)
        if i==1:
            for dx in [-.045,0,.045]:tube('tool_fork',[(x+dx,-1.10,.97),(x+dx,-1.10,.75)],.009,silver,8)
        else:
            blade=sphere('tool_spade',(x,-1.09,.86),(.075,.014,.12),silver,16,10)
    cylinder('lantern_roof_hook',.012,.17,(0,-1.13,2.58),iron,12)
    box('lantern_glass',(.19,.15,.26),(0,-1.15,2.34),amber,.025)
    for x in [-.105,.105]:
        for y in [-1.24,-1.06]:beam('lantern_frame',(x,y,2.20),(x,y,2.48),.018,.018,iron,.003)
    box('lantern_cap',(.26,.23,.05),(0,-1.15,2.50),iron,.025)
    for row in range(3):
        box('shed_crate_plank',(.52,.055,.11),(-.40,-1.34,.09+row*.12),wood,.012)
    ivy_curve=[(-1.28,-1.00,2.7),(-1.38,-1.03,2.1),(-1.32,-1.02,1.45),(-1.37,-.99,.65)]
    tube('shed_ivy_stem',ivy_curve,.012,greens[0],7)
    for i in range(25):
        t=i/24;z=2.7-t*2;side=(-1)**i;start=(-1.30,-1.045,z)
        leaf('shed_ivy_leaf',start,(-1.30+side*.15,-1.14,z-.14),.08,greens[i%4],lobes=2,bend=.018)

def barrel():
    for i in range(18):
        a=i*math.tau/18;half=math.pi/18*.97
        profile=[(.14,.34),(.30,.39),(.62,.43),(.94,.39),(1.04,.35)]
        vertices=[]
        for z,r in profile:
            for u in [a-half,a+half]:vertices.append((math.cos(u)*r,math.sin(u)*r,z))
        faces=[(j*2,j*2+1,j*2+3,j*2+2) for j in range(len(profile)-1)]
        plank=mesh('barrel_stave',vertices,faces,wood if i%3 else oaklight)
        mod=plank.modifiers.new('Stave thickness','SOLIDIFY');mod.thickness=.025
    for z,r in [(.23,.375),(.61,.438),(.97,.373)]:
        torus('barrel_iron_hoop',r,.030,(0,0,z),iron)
        for i in range(12):
            a=i*math.tau/12;sphere('barrel_rivet',(math.cos(a)*(r+.025),math.sin(a)*(r+.025),z),(.012,.012,.014),silver,10,8)
    cylinder('barrel_water',.329,.012,(0,0,1.025),watermat,48)
    torus('barrel_top_rim',.35,.023,(0,0,1.04),oaklight)
    for x in [-.28,.28]:
        for y in [-.28,.28]:box('barrel_stone_stand',(.53,.53,.14),(x,y,.07),stone[0],.035)
    tube('barrel_brass_tap',[(0,-.40,.34),(0,-.53,.34),(0,-.56,.27)],.026,gold,12)
    cylinder('barrel_tap_handle',.014,.09,(0,-.50,.39),gold,12)
    beam('barrel_tap_lever',(-.055,-.50,.435),(.055,-.50,.435),.022,.022,gold,.008)

def watering_can():
    lathe('watering_can_body',[(.02,.16),(.06,.17),(.30,.14),(.34,.145)],silver,32)
    torus('can_rim',.145,.013,(0,0,.34),silver)
    torus('can_bottom_rim',.166,.009,(0,0,.028),silver)
    tube('watering_spout',[(-.13,0,.10),(-.26,0,.22),(-.40,0,.38)],[.043,.029,.023],silver,16)
    rose=cylinder('watering_rose',.072,.025,(-.43,0,.415),silver,24);rose.rotation_euler.y=-.65
    for j in range(13):
        a=j*2.39996;r=.013*math.sqrt(j);sphere('rose_hole',(-.45+math.sin(a)*r,math.cos(a)*r,.428),(.004,.004,.003),iron,8,6)
    tube('can_top_handle',[(-.12,0,.29),(-.12,0,.48),(0,0,.56),(.13,0,.47),(.13,0,.29)],.018,silver,12)
    tube('can_rear_handle',[(.13,0,.29),(.26,0,.32),(.30,0,.19),(.17,0,.08)],.017,silver,12)

def fence_rail(length=2):
    for z in [.35,.90]:box('fence_horizontal_rail',(length,.085,.12),(0,0,z),wood,.02)
    count=max(2,int(length/.34))
    for i in range(count):box('fence_picket',(.075,.075,.55),(-length/2+(i+.5)*length/count,0,.63),oaklight,.012)

def fence_post():
    box('fence_post',(.16,.16,1.12),(0,0,.56),wood,.015)
    # Four-sided pyramid cap.
    bpy.ops.mesh.primitive_cone_add(vertices=4,radius1=.16,radius2=.03,depth=.12,location=(0,0,1.17),rotation=(0,0,math.pi/4));finish(bpy.context.object,'fence_post_cap',oaklight)
    box('fence_post_foot',(.21,.21,.09),(0,0,.045),stone[0],.018)

def fence_module():
    fence_rail()
    for x in [-1,1]:
        before=set(bpy.context.scene.objects);fence_post();move_group(before,(x,0,0))

def tree():
    bark=textured('Tree bark',(.24,.12,.045));rng=random.Random(113)
    tube('tree_trunk',[(0,0,0),(.06,.02,.65),(-.06,.01,1.35),(.08,0,2.25)],[.26,.21,.17,.10],bark,14)
    for i in range(7):
        a=i*math.tau/7;tube('tree_root',[(.40*math.cos(a),.40*math.sin(a),.01),(.23*math.cos(a),.23*math.sin(a),.12),(0,0,.45)],[.035,.09,.12],bark,8)
    for i in range(13):
        a=i*2.39996;rad=.70+(i%3)*.20;end=Vector((math.cos(a)*rad,math.sin(a)*rad,2.35+(i%4)*.27))
        tube('tree_branch',[(0,0,1.25),tuple(end*.70+Vector((0,0,.15))),tuple(end)],[.11,.065,.018],bark,10)
        for j in range(65):
            u=rng.random()*math.tau;r=math.sqrt(rng.random())*.64;z=rng.uniform(-.32,.46)
            p=end+Vector((math.cos(u)*r,math.sin(u)*r,z));v=Vector((math.cos(u)*.25,math.sin(u)*.25,rng.uniform(-.24,.24)))
            leaf('tree_leaf',p-v*.4,p+v,.085+rng.random()*.025,greens[rng.randrange(4)],bend=.025,rows=6)
    # Rounded top crown fills the central gap without polygonal blob spheres.
    for i in range(180):
        a=i*2.39996;r=math.sqrt((i+.5)/180)*.75;p=Vector((math.cos(a)*r,math.sin(a)*r,3.15+.25*(1-r/.75)))
        leaf('tree_top_leaf',p,p+Vector((math.cos(a)*.25,math.sin(a)*.25,.03)),.10,greens[i%4],bend=.025,rows=6)

def flower_border():
    rng=random.Random(22)
    for i in range(30):
        a=i*2.39996;r=.35*math.sqrt((i+.5)/30);h=.13+rng.random()*.20
        start=(math.cos(a)*r*.5,math.sin(a)*r*.5,.015);end=(math.cos(a)*r,math.sin(a)*r,h)
        leaf('border_leaf',start,end,.08,greens[i%4],bend=.04,rows=8)
    for head,(cx,cy,cz) in enumerate([(-.21,-.03,.30),(0,.10,.39),(.21,-.02,.30)]):
        tube('border_flower_stem',[(cx*.6,cy*.6,0),(cx,cy,cz)],.007,greens[0],6)
        for i in range(14):
            a=i*2.39996;r=.11*math.sqrt((i+.5)/14);p=(cx+math.cos(a)*r,cy+math.sin(a)*r,cz+.045*(1-r/.11))
            flower(p,[lavender,pink,lavender][head],.50,True)
    for i in range(4):flower((-.30+i*.20,-.15,.22),white,.5,True)

def paving(width=2,depth=2):
    box('paving_bedding',(width,depth,.08),(0,0,-.06),stone[0],.01)
    rng=random.Random(72);rows=round(depth/.40);cols=round(width/.50);vertices=[];faces=[];materials=[]
    for row in range(rows):
        y=-depth/2+(row+.5)*depth/rows
        for col in range(cols):
            x=-width/2+(col+.5)*width/cols;hw=width/cols/2-.006;hd=depth/rows/2-.006;bevel=.016;z=rng.uniform(-.002,.002);start=len(vertices)
            for inset,height in [(0,z-.04),(0,z+.006),(bevel,z+.022)]:
                a,b=hw-inset,hd-inset;c=min(.018,a*.1)
                vertices.extend([(x+u,y+v,height) for u,v in [(-a+c,-b),(a-c,-b),(a,-b+c),(a,b-c),(a-c,b),(-a+c,b),(-a,b-c),(-a,-b+c)]])
            local=[]
            for ring in range(2):
                for j in range(8):local.append((start+ring*8+j,start+ring*8+(j+1)%8,start+(ring+1)*8+(j+1)%8,start+(ring+1)*8+j))
            local.append(tuple(start+16+j for j in range(8)));faces.extend(local);materials.extend([(row*3+col*5)%4]*len(local))
    o=mesh('limestone_pavers',vertices,faces,stone[0],False)
    for mat in stone[1:]:o.data.materials.append(mat)
    for p,index in zip(o.data.polygons,materials):p.material_index=index
    uv=o.data.uv_layers.active
    for loop in o.data.loops:
        v=o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(v.x/.5,v.y/.4)

def portal():
    # Oval arch, with the vortex exported separately for real-time shader animation.
    lathe('portal_plinth',[(0,.82),(.06,.90),(.13,.87),(.25,.72),(.30,.71)],teal,64)
    for z,r in [(.08,.88),(.26,.72)]:torus('portal_plinth_gold',r,.021,(0,0,z),gold)
    center=(0,0,1.26)
    def arc_points(rad,offset=0):return [(math.cos(t)*rad,offset,1.26+math.sin(t)*rad*1.29) for t in [i*math.tau/96 for i in range(97)]]
    tube('portal_arch',arc_points(.61),.095,teal,12)
    tube('portal_outer_stone',arc_points(.68,.02),.052,stone[2],10)
    tube('portal_inner_gold',arc_points(.56,-.055),.022,gold,8)
    tube('portal_inner_glow',arc_points(.535,-.060),.016,cyan,8)
    for x in [-.58,.58]:
        box('portal_support',(.17,.23,.50),(x,0,.48),teal,.03)
        for z in [.52,1.20,1.65]:box('portal_gold_band',(.22,.25,.075),(x,0,z),gold,.014)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(0,-.01,2.16));o=bpy.context.object;o.scale=(.105,.07,.17);finish(o,'portal_crown',gold)
    # Blank exit arrow: lettering stays editable in the renderer.
    box('exit_sign_post',(.065,.065,.59),(.89,-.10,.295),wood,.01)
    vertices=[(.53,-.15,.45),(.98,-.15,.45),(1.09,-.15,.58),(.98,-.15,.71),(.53,-.15,.71)]
    sign=mesh('exit_blank_arrow',vertices,[(0,1,2,3,4)],oaklight,False);mod=sign.modifiers.new('Arrow thickness','SOLIDIFY');mod.thickness=.045

def mouse():
    fur=textured('Mouse warm grey fur',(.28,.25,.23),'cloth');inner=material('Mouse pink ears',(.65,.31,.30),.8)
    body=sphere('mouse_body',(0,.03,.13),(.105,.145,.10),fur,24,14)
    sphere('mouse_head',(0,-.115,.145),(.077,.080,.071),fur,24,14)
    sphere('mouse_muzzle',(0,-.181,.119),(.049,.048,.034),fur,20,12)
    sphere('mouse_nose',(0,-.225,.124),(.015,.009,.011),inner,14,10)
    for s in [-1,1]:
        sphere('mouse_ear',(s*.060,-.080,.218),(.046,.021,.054),fur,20,12)
        sphere('mouse_ear_inner',(s*.060,-.100,.219),(.033,.005,.041),inner,16,10)
        sphere('mouse_eye',(s*.058,-.153,.169),(.012,.009,.014),iron,16,10)
        sphere('mouse_eye_glint',(s*.057,-.162,.175),(.003,.002,.003),white,8,6)
        for i in range(3):tube('mouse_whisker',[(s*.030,-.195,.125),(s*.10,-.22+i*.017,.12+i*.005)],.0007,white,4)
        for y in [-.06,.11]:sphere('mouse_paw',(s*.070,y,.038),(.020,.034,.017),inner,16,10)
    tube('mouse_tail',[(0,.15,.095),(.07,.24,.065),(.14,.28,.055),(.22,.27,.08)],[.012,.009,.006,.001],inner,9)

BUILDERS=[('raised-bed',raised_bed),('plot-sign',plot_sign),('tool-shed',tool_shed),('water-barrel',barrel),('watering-can',watering_can),('fence',fence_module),('fence-rail',fence_rail),('fence-post',fence_post),('garden-tree',tree),('flower-border',flower_border),('paving-module',paving),('garden-floor',lambda:paving(16,12)),('exit-portal',portal),('mouse',mouse)]
for kind in ['carrot','tomato','corn','strawberry']:
    for stage in ['growing','ripe','wilted']:BUILDERS.append(('crop-'+kind+'-'+stage,lambda kind=kind,stage=stage:crop(kind,stage)))
selected=set(next((arg.split('=',1)[1] for arg in sys.argv if arg.startswith('--only=')),'').split(','))-{''}
os.makedirs(OUT,exist_ok=True);results=[]
for name,build in BUILDERS:
    if selected and name not in selected:continue
    print('BUILD',name,flush=True);build()
    results.append(export_asset(os.path.join(OUT,name+'.glb')))
manifest_path=os.path.join(OUT,'manifest.json')
if selected and os.path.exists(manifest_path):
    old=json.load(open(manifest_path,encoding='utf8'))['assets'];updates={a['file']:a for a in results}
    results=[updates.pop(a['file'],a) for a in old]+list(updates.values())
with open(manifest_path,'w',encoding='utf8') as f:json.dump({'units':'metres','reference':'design/farm-v2-reference/','front':'Blender -Y; runtime normalizes glTF to -Z','assets':results},f,indent=2)
print('COMMUNITY GARDEN COMPLETE',len(results),'assets',flush=True)
