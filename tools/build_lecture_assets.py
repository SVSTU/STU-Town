"""Khu C: real modular GLBs and compatible campus humanoids. Blender 5.2."""
import bpy,os,sys,json,math,unicodedata
from mathutils import Vector
sys.path.insert(0,os.path.dirname(__file__))
from asset_modeling import *
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
OUT=os.path.join(ROOT,'client/assets/3d/lecture-v1');SRC=os.path.join(ROOT,'source-assets/lecture-v1')
CHAR=os.path.join(ROOT,'client/assets/3d/characters/campus-v1')
for d in [OUT,SRC,CHAR]:os.makedirs(d,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
rounded_box=box
def box(name,size,pos,mat,bevel=.015):
    o=rounded_box(name,size,pos,mat,0)
    if bevel:
        m=o.modifiers.new('Single edge chamfer','BEVEL');m.width=min(bevel,min(size)*.45);m.segments=1;bpy.ops.object.modifier_apply(modifier=m.name)
        m=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');m.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=m.name)
    return o
M={k:material('lecture.'+k,c,.72,.6 if k=='metal' else 0) for k,c in {
 'wood':(.50,.26,.095),'oak':(.66,.38,.16),'blue':(.065,.15,.29),'cream':(.84,.74,.57),
 'brick':(.48,.16,.09),'tile':(.70,.62,.51),'ivory':(.94,.87,.71),'metal':(.08,.095,.11),
 'gold':(.70,.43,.12),'green':(.035,.10,.055),'sage':(.26,.34,.16),'orange':(.67,.27,.08)}.items()}
FONT=bpy.data.fonts.load('C:/Windows/Fonts/arialbd.ttf')
labels=json.load(open(os.path.join(ROOT,'design/khu-c-lecture-reference/labels.vi.json'),encoding='utf-8-sig'))
for v in labels.values():assert unicodedata.normalize('NFC',v)==v

def txt(value,pos,width,size=.2,mat=None):
    bpy.ops.object.text_add(location=pos,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='label_'+value
    o.data.body=value;o.data.font=FONT;o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.size=size;o.data.extrude=.001;o.data.resolution_u=3;o.data.materials.append(mat or M['ivory'])
    bpy.context.view_layer.update()
    if o.dimensions.x>width:o.scale*=width/o.dimensions.x
    bpy.ops.object.convert(target='MESH');return o

def sign(value,width=2,height=.36):
    box('sign_frame',(width+.08,.1,height+.08),(0,0,height/2+.04),M['gold'],.025)
    box('sign_blue_face',(width,.035,height),(0,-.063,height/2+.04),M['blue'],.02)
    txt(value,(0,-.087,height/2+.04),width-.12,height*.65)

def floor():
    box('floor_foundation',(3,3.5,.16),(0,0,-.10),M['wood'])
    for i in range(6):
        for j in range(7):
            x=-1.25+i*.5;y=-1.5+j*.5
            mesh('floor_tile',[(x-.246,y-.246,.012),(x+.246,y-.246,.012),(x+.246,y+.246,.012),(x-.246,y+.246,.012)],[(0,1,2,3)],M['tile'] if (i+j)%3 else M['cream'],False)

def wall(low=False,window=False):
    h=.66 if low else 3.8
    box('wall_plaster',(3,.18,h),(0,0,h/2),M['cream'])
    for row in range(3):
        for i in range(6):box('brick',(.48,.21,.16),(-1.25+i*.5,-.012,.1+row*.18),M['brick'],.005)
    box('wall_top',(3.05,.25,.12),(0,0,h+.06),M['wood'])
    if not low:
        for x in [-1.43,1.43]:box('timber_column',(.15,.25,3.85),(x,0,1.925),M['wood'])
    if window:
        before=set(bpy.context.scene.objects);window_unit()
        for o in set(bpy.context.scene.objects)-before:o.location.z+=1.15;o.location.y-=.16

def window_unit():
    box('window_frame',(1.1,.13,1.8),(0,0,.9),M['oak'])
    box('window_glass',(.94,.025,1.63),(0,-.08,.9),M['cream'])
    for x in [-.23,.23]:box('window_vertical',(.04,.04,1.63),(x,-.11,.9),M['oak'])
    for z in [.48,.93,1.38]:box('window_horizontal',(.94,.04,.04),(0,-.11,z),M['oak'])
    for x in [-.76,.76]:
        box('shutter',(.35,.1,1.8),(x,-.09,.9),M['blue'])
        for i in range(11):box('shutter_louver',(.30,.045,.07),(x,-.16,.13+i*.15),M['blue'],.005)

def desk():
    box('desk_top',(1.6,.65,.075),(0,0,.7225),M['oak'],.025)
    for x in [-.69,.69]:
        for y in [-.23,.23]:box('desk_leg',(.065,.065,.70),(x,y,.35),M['wood'])
    for y in [-.255,.255]:box('desk_apron',(1.44,.045,.15),(0,y,.62),M['wood'])

def chair():
    box('chair_seat',(.46,.45,.055),(0,-.015,.45),M['blue'],.025)
    # Front is Blender -Y. Back supports extend to +Y; runtime rotates chairs toward +Z.
    box('chair_back',(.46,.055,.30),(0,.20,.75),M['blue'],.035)
    for x in [-.19,.19]:
        for y in [-.18,.18]:beam('chair_leg',(x*1.12,y*1.12,0),(x,y,.45),.032,.032,M['metal'],.006)
        beam('chair_back_support',(x,.18,.42),(x,.20,.86),.028,.028,M['metal'],.006)

def teacher_desk():
    box('teacher_front',(2,.12,.80),(0,-.31,.43),M['wood'])
    for x in [-.92,.92]:box('teacher_side',(.12,.74,.88),(x,0,.44),M['oak'])
    box('teacher_top',(2.12,.89,.10),(0,0,.90),M['oak'],.025)
    box('book_banner',(.57,.025,.55),(0,-.39,.52),M['blue'])
    # Book pictogram is geometry rather than AI-generated writing.
    for s in [-1,1]:
        page=box('book_emblem',(.19,.012,.24),(s*.1,-.411,.55),M['ivory'],.01);page.rotation_euler.y=s*.12
    box('desk_rear_drawer',(.75,.10,.16),(0,.27,.75),M['wood'])

def board():
    box('chalkboard_frame',(8,.15,1.85),(0,0,.925),M['oak'])
    box('chalkboard_green',(7.8,.035,1.65),(0,-.095,.925),M['green'])
    box('chalk_tray',(7.8,.17,.065),(0,-.16,.10),M['oak'])
    # Graduation-cap outline, with no baked gibberish text.
    tube('chalk_cap',[(2.1,-.12,1.28),(2.65,-.12,1.53),(3.2,-.12,1.28),(2.65,-.12,1.04),(2.1,-.12,1.28)],.012,M['ivory'],5)
    tube('chalk_cap_lower',[(2.3,-.12,1.16),(2.3,-.12,.94),(2.65,-.12,.83),(3,-.12,.94),(3,-.12,1.16)],.012,M['ivory'],5)
    for x in [-3.5,3.5]:box('chalk',(.10,.035,.025),(x,-.18,.15),M['ivory'])

def screen():
    cylinder('screen_housing',.075,3.35,(0,0,1.94),M['cream'],16).rotation_euler.y=math.pi/2
    box('screen_fabric',(3.2,.018,1.85),(0,-.025,.99),M['ivory'],0)
    cylinder('screen_lower_bar',.025,3.3,(0,-.025,.065),M['metal'],12).rotation_euler.y=math.pi/2
    torus('screen_pull_ring',.045,.009,(0,-.025,.025),M['gold'],True)

def projector():
    box('projector_body',(.43,.34,.16),(0,0,.08),M['cream'],.025)
    cylinder('projector_lens',.067,.07,(0,-.18,.08),M['metal'],20).rotation_euler.x=math.pi/2
    for x in [-.14,.14]:
        for i in range(3):box('projector_vent',(.045,.014,.012),(x,-.175,.045+i*.03),M['metal'],.003)
    box('projector_bracket',(.055,.055,.28),(0,0,.30),M['metal'])
    box('projector_mount',(.20,.14,.035),(0,0,.455),M['metal'])

def shelf():
    box('bookshelf_back',(1.8,.08,2.6),(0,.27,1.3),M['wood'])
    for x in [-.86,.86]:box('bookshelf_side',(.08,.6,2.65),(x,0,1.325),M['oak'])
    for z in [.08,.91,1.74,2.58]:box('bookshelf_level',(1.8,.62,.08),(0,0,z),M['oak'])
    for row in [1,2]:
        for i in range(10):box('shelf_book',(.12,.33,.52+(i%3)*.03),(-.71+i*.155,-.03,.96+(row-1)*.83+.27),[M['blue'],M['ivory'],M['sage'],M['orange']][i%4])
    for x in [-.42,.42]:box('archive_box',(.65,.44,.48),(x,0,.36),M['cream'])

def notice():
    box('notice_frame',(1.8,.11,1.3),(0,0,.65),M['oak'])
    box('notice_blue',(1.65,.025,1.15),(0,-.075,.65),M['blue'])
    for x,z in [(-.50,.77),(0,.49),(.50,.77)]:
        box('notice_paper',(.40,.018,.6),(x,-.10,z),M['ivory'],.005)
        for i in range(4):box('paper_line',(.25,.007,.014),(x,-.114,z+.15-i*.09),M['wood'],0)

def schedule():
    box('schedule_frame',(1.85,.12,1.15),(0,0,.575),M['gold'])
    box('schedule_blue',(1.76,.025,1.06),(0,-.076,.575),M['blue'])
    txt(labels['scheduleHeading'],(0,-.096,.93),1.55,.21)
    for z,key in [(.57,'scheduleMorning'),(.24,'scheduleAfternoon')]:
        box('schedule_inset',(1.56,.025,.27),(0,-.097,z),M['cream']);txt(labels[key],(0,-.116,z),1.42,.19,M['metal'])

def book(opened=False):
    if not opened:
        box('book_pages',(.28,.35,.043),(0,0,.027),M['ivory'],.004)
        for z in [.003,.052]:box('book_cover',(.31,.38,.012),(0,0,z),M['blue'],.005)
        box('book_spine',(.017,.38,.06),(-.15,0,.03),M['blue'])
    else:
        for s in [-1,1]:
            o=box('open_cover',(.24,.35,.012),(s*.117,0,.012),M['blue'],.004);o.rotation_euler.y=s*.12
            o=box('open_pages',(.225,.33,.04),(s*.115,0,.04),M['ivory'],.006);o.rotation_euler.y=s*.12

def laptop():
    box('laptop_base',(.40,.29,.024),(0,0,.012),M['metal'],.012)
    for i in range(8):
        for j in range(3):box('laptop_key',(.032,.026,.004),(-.14+i*.04,-.025+j*.037,.027),M['cream'],.002)
    box('trackpad',(.11,.055,.003),(0,-.105,.027),M['cream'],.004)
    lid=empty('laptop_lid',pos=(0,.13,.025))
    for name,size,pos,mat in [('laptop_lid_body',(.40,.018,.27),(0,.13,.16),M['metal']),('laptop_screen',(.36,.007,.22),(0,.116,.16),M['blue'])]:parent_keep(box(name,size,pos,mat,.01),lid)
    lid.rotation_euler.x=-.20

def pens():
    box('pen_holder',(.12,.10,.14),(0,0,.07),M['oak'],.015)
    for i,mat in enumerate([M['blue'],M['orange'],M['ivory'],M['wood']]):cylinder('pen',.01,.23,(-.035+i*.025,0,.17),mat,8)

def clock():
    for name,r,depth,y,mat in [('clock_rim',.34,.065,0,M['oak']),('clock_face',.305,.015,-.04,M['ivory'])]:
        o=cylinder(name,r,depth,(0,y,.34),mat,40);o.rotation_euler.x=math.pi/2
    for i in range(12):
        a=i*math.tau/12
        beam('clock_tick',(math.sin(a)*.25,-.052,.34+math.cos(a)*.25),(math.sin(a)*.28,-.052,.34+math.cos(a)*.28),.012,.012,M['metal'],.003)
    for dx,dz in [(-.13,.10),(.17,.13)]:beam('clock_hand',(0,-.064,.34),(dx,-.064,.34+dz),.014,.014,M['metal'],.004)

def platform():
    box('teaching_platform',(14,2.8,.28),(0,0,.14),M['oak'])
    for i in range(2):box('platform_step',(2.8,.32,.14*(i+1)),(0,-1.4-.32*(1.5-i),.07*(i+1)),M['wood'])

def exit_gate():
    for x in [-1.55,1.55]:
        box('exit_post',(.18,.24,2.85),(x,0,1.425),M['wood'])
        box('exit_foot',(.33,.40,.32),(x,0,.16),M['cream'])
    tube('exit_arch',[(-1.55,0,2.78),(-1.0,0,2.97),(0,0,3.17),(1,0,2.97),(1.55,0,2.78)],.115,M['oak'],8,True)
    before=set(bpy.context.scene.objects);sign(labels['mainExit'],2.45,.34)
    for o in set(bpy.context.scene.objects)-before:o.location.z+=2.25;o.location.y-=.13
    for x in [-.95,.95]:beam('sign_hanger',(x,-.08,2.70),(x,-.08,2.95),.018,.018,M['metal'])
    for i in range(2):box('exit_step',(3.45-i*.12,.48+i*.28,.12),(0,-.3-i*.22,.06-i*.10),M['cream'])

def schedule_panel():box('schedule_support',(2.2,.18,1.55),(0,0,.775),M['cream'])

ONLY=sys.argv[sys.argv.index('--only')+1] if '--only' in sys.argv else None
SELECTED=ONLY.split(',') if ONLY else []
CHARACTERS_ONLY='--characters-only' in sys.argv
assets=[]
if ONLY or CHARACTERS_ONLY:
    assets=json.load(open(os.path.join(OUT,'manifest.json'),encoding='utf8'))['assets']
    assets=[a for a in assets if a['id'] not in SELECTED]
for name,fn in [('floor-module',floor),('wall-plain',wall),('wall-window',lambda:wall(window=True)),('wall-low',lambda:wall(low=True)),('window-shutters',window_unit),
 ('student-desk',desk),('student-chair',chair),('teacher-desk',teacher_desk),('chalkboard',board),('projection-screen',screen),('projector',projector),
 ('bookshelf',shelf),('noticeboard',notice),('lecture-title',lambda:sign(labels['lectureTitle'],5.7,.48)),('schedule-sign',schedule),
 ('open-book',lambda:book(True)),('closed-book',book),('laptop',laptop),('pen-holder',pens),('wall-clock',clock),('teaching-platform',platform),('exit-gate',exit_gate),('schedule-panel',schedule_panel)]:
    if CHARACTERS_ONLY or (ONLY and name not in SELECTED):continue
    fn();rec=export_asset(os.path.join(OUT,name+'.glb'),True,os.path.join(SRC,name+'.blend'));rec['id']=name;assets.append(rec);print('LECTURE ASSET',name,rec['bytes'],flush=True)
label_assets={'lecture-title':[labels['lectureTitle']],'schedule-sign':[labels[k] for k in ['scheduleHeading','scheduleMorning','scheduleAfternoon']],'exit-gate':[labels['mainExit']]}
for asset in assets:
    if asset['id'] in label_assets:asset['labels']=label_assets[asset['id']]
with open(os.path.join(OUT,'manifest.json'),'w',encoding='utf8') as f:json.dump({'version':1,'units':'metres','front':'Blender -Y; glTF -Z','assets':assets,'reusedPack':'khu-a-coop-v1','reusedAssets':['wall-lantern','potted-plant','flower-planter','hanging-plant'],'reference':'design/khu-c-lecture-reference/00-approved-concept.png','typography':{'encoding':'UTF-8 NFC','font':'Arial Bold','source':'design/khu-c-lecture-reference/labels.vi.json'}},f,ensure_ascii=False,indent=2)
if ONLY:sys.exit(0)

# Extend the existing humanoid library without modifying or duplicating the old game presets.
def import_campus():
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'client/assets/3d/characters/coop-v1/modular-human.glb'))
    head=bpy.data.objects['student_head_mount']
    brown=bpy.data.materials.get('char.hair');uniform=material('char.uniform',(.065,.15,.29))
    hairroot=empty('module__hair__ponytail__head',parent=head)
    before=set(bpy.context.scene.objects)
    sphere('ponytail_cap',(0,.02,1.65),(.25,.205,.135),brown,20,12)
    for i in range(5):sphere('ponytail_fringe',(-.18+i*.085,-.145,1.67+(.025 if i%2 else 0)),(.085,.095,.065),brown,12,8)
    sphere('ponytail_tail',(0,.26,1.48),(.11,.10,.20),brown,16,10)
    meshes=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH'];o=batch('ponytail_geometry',meshes);parent_keep(o,hairroot)
    for original in [o for o in bpy.context.scene.objects if o.type=='EMPTY' and o.name.startswith('module__outfit__vest__')]:
        def clone_branch(old,parent):
            new=old.copy();new.name=old.name.replace('__vest__','__uniform__');bpy.context.collection.objects.link(new);new.parent=parent
            if old.type=='MESH':
                new.data=old.data.copy()
                for i,m in enumerate(new.data.materials):
                    if m.name.split('.')[0:2]==['char','vest']:new.data.materials[i]=uniform
            for child in old.children:clone_branch(child,new)
            return new
        clone_branch(original,original.parent)

def remove_unselected(preset):
    for o in [o for o in bpy.context.scene.objects if o.type=='EMPTY' and o.name.startswith('module__')]:
        slot,opt=o.name.split('__')[1:3]
        selected=opt in preset['accessories'] if slot=='accessory' else preset[slot]==opt
        if not selected:
            for child in list(o.children_recursive):bpy.data.objects.remove(child,do_unlink=True)
            bpy.data.objects.remove(o,do_unlink=True)

chars=[]
for name,preset in [('modular-human',None),('student',{'hair':'wavy','outfit':'polo','accessories':['backpack']}),('student-female',{'hair':'ponytail','outfit':'uniform','accessories':['backpack']}),('professor',{'hair':'gray','outfit':'vest','accessories':['glasses']})]:
    # Clear unused imported data to preserve canonical material/node names between exports.
    bpy.data.orphans_purge(do_recursive=True)
    import_campus()
    if preset:remove_unselected(preset)
    # Keep facing/name anchors and selectable modules; batch the static facial details.
    head=bpy.data.objects['student_head_mount']
    details=[o for o in head.children if o.type=='MESH' and o.name not in ('student_head','student_nose')]
    if len(details)>1:batch('student_face_details',details)
    rec=export_asset(os.path.join(CHAR,name+'.glb'),False,os.path.join(SRC,'characters',name+'.blend'));rec.update({'id':name,'preset':preset,'rig':'student-animation-v1'});chars.append(rec)
    print('CAMPUS CHARACTER',name,rec['bytes'],flush=True)
with open(os.path.join(CHAR,'manifest.json'),'w',encoding='utf8') as f:json.dump({'version':1,'units':'metres','assets':chars,'rig':'student-animation-v1','slots':{'hair':['wavy','braid','gray','ponytail'],'outfit':['polo','apron','vest','uniform'],'accessories':['backpack','glasses']}},f,ensure_ascii=False,indent=2)
print('LECTURE BUILD COMPLETE',len(assets),'props and',len(chars),'humanoids',flush=True)
