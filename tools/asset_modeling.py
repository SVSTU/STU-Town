"""Small deterministic Blender modelling helpers; no scene changes on import."""
import bpy, math, os, random, json
from mathutils import Vector

def material(name, color, roughness=.65, metallic=0, emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=roughness;p.inputs['Metallic'].default_value=metallic
    if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    return m

def textured(name, color, kind='wood', size=256):
    m=material(name,color);image=bpy.data.images.new(name+'-albedo',width=size,height=size)
    rng=random.Random(42);pixels=[]
    for y in range(size):
        for x in range(size):
            u=x/size;v=y/size
            if kind=='wood':
                bend=.07*math.sin(v*8)+.025*math.sin(v*23)
                grain=math.sin((u+bend)*155+math.sin(v*18))*math.sin((u+bend)*35)
                value=.88+.09*grain+.035*math.sin((u+bend)*530)+rng.uniform(-.025,.025)
            elif kind=='cloth':value=.92+.035*math.sin(x*math.pi)+.035*math.sin(y*math.pi)+rng.uniform(-.025,.025)
            elif kind=='leaf':
                vein=math.exp(-((u-.5)/.012)**2)*.20
                branch=math.exp(-(math.sin((v*9-abs(u-.5)*3.4)*math.pi)/.10)**2)*.12
                value=.78+.15*(1-abs(u-.5)*2)+vein+branch+rng.uniform(-.02,.02)
            else:value=.84+rng.uniform(-.13,.13)+.06*math.sin(u*39+math.sin(v*42))
            linear=[min(1,max(0,c*value)) for c in color]
            pixels.extend([12.92*c if c<=.0031308 else 1.055*c**(1/2.4)-.055 for c in linear]+[1])
    image.pixels.foreach_set(pixels);image.pack()
    node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
    m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    return m

def finish(obj,name,mat,smooth=False):
    obj.name=name
    if mat:obj.data.materials.append(mat)
    if smooth:
        for p in obj.data.polygons:p.use_smooth=True
    return obj

def box(name,size,position,mat,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=position);o=bpy.context.object;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft crafted edges','BEVEL');mod.width=min(bevel,min(size)*.45);mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');mod.keep_sharp=True
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,mat)

def sphere(name,position,scale,mat,segments=24,rings=14):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=position)
    o=bpy.context.object;o.scale=scale;return finish(o,name,mat,True)

def cylinder(name,radius,depth,position,mat,vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=position)
    o=bpy.context.object;return finish(o,name,mat,True)

def torus(name,radius,thickness,position,mat,vertical=False):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=thickness,major_segments=48,minor_segments=10,location=position)
    o=bpy.context.object
    if vertical:o.rotation_euler.x=math.pi/2
    return finish(o,name,mat,True)

def mesh(name,vertices,faces,mat,smooth=True):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);finish(o,name,mat,smooth)
    uv=data.uv_layers.new(name='UVMap')
    lo=[min(v[i] for v in vertices) for i in range(3)];hi=[max(v[i] for v in vertices) for i in range(3)]
    axes=sorted(range(3),key=lambda i:hi[i]-lo[i],reverse=True)[:2]
    for loop in data.loops:
        p=data.vertices[loop.vertex_index].co
        uv.data[loop.index].uv=tuple((p[i]-lo[i])/max(.00001,hi[i]-lo[i]) for i in axes)
    return o

def tube(name,points,radius,mat,sides=8,curved=False):
    # Parallel local frames give controllable tapered branches without curve tessellation surprises.
    points=[Vector(p) for p in points];verts=[]
    radii=radius if isinstance(radius,(list,tuple)) else [radius]*len(points)
    if curved and len(points)>2:
        smooth=[];smooth_radii=[]
        for i in range(len(points)-1):
            p0,p1,p2,p3=points[max(0,i-1)],points[i],points[i+1],points[min(len(points)-1,i+2)]
            for j in range(5):
                t=j/5;smooth.append((p1*2+(-p0+p2)*t+(p0*2-p1*5+p2*4-p3)*t*t+(-p0+p1*3-p2*3+p3)*t*t*t)*.5)
                smooth_radii.append(radii[i]*(1-t)+radii[i+1]*t)
        points=smooth+[points[-1]];radii=smooth_radii+[radii[-1]]
    previous=None
    for i,p in enumerate(points):
        tangent=(points[min(i+1,len(points)-1)]-points[max(i-1,0)]).normalized()
        if previous is None:
            axis=Vector((0,0,1)) if abs(tangent.z)<.92 else Vector((0,1,0));a=tangent.cross(axis).normalized()
        else:a=(previous-tangent*previous.dot(tangent)).normalized()
        b=tangent.cross(a).normalized();previous=a
        for j in range(sides):verts.append(tuple(p+(a*math.cos(j*math.tau/sides)+b*math.sin(j*math.tau/sides))*radii[i]))
    faces=[tuple(range(sides-1,-1,-1))]
    for i in range(len(points)-1):
        for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces.append(tuple((len(points)-1)*sides+j for j in range(sides)))
    return mesh(name,verts,faces,mat)

def beam(name,start,end,width,depth,mat,bevel=.015):
    a,b=Vector(start),Vector(end);o=box(name,(width,depth,(b-a).length),(a+b)/2,mat,bevel)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

def leaf(name,start,end,width,mat,lobes=0,bend=.02,rows=10):
    a,b=Vector(start),Vector(end);direction=(b-a).normalized();side=direction.cross(Vector((0,0,1)))
    if side.length<.01:side=Vector((1,0,0))
    side.normalize();verts=[]
    for i in range(rows+1):
        t=i/rows;middle=a.lerp(b,t)+Vector((0,0,bend*math.sin(t*math.pi)))
        span=width*math.sin(math.pi*t)**.7*(1+(.18*math.sin(t*math.pi*lobes*2) if lobes else 0))
        for s in [-1,0,1]:verts.append(tuple(middle+side*(span*s)+Vector((0,0,-abs(s)*span*.13))))
    faces=[]
    for i in range(rows):
        for j in range(2):faces.append((i*3+j,(i+1)*3+j,(i+1)*3+j+1,i*3+j+1))
    o=mesh(name,verts,faces,mat);uv=o.data.uv_layers.active
    for loop in o.data.loops:uv.data[loop.index].uv=((loop.vertex_index%3)/2,(loop.vertex_index//3)/rows)
    return o

def lathe(name,profile,mat,segments=32):
    verts=[(r*math.cos(j*math.tau/segments),r*math.sin(j*math.tau/segments),z) for z,r in profile for j in range(segments)]
    faces=[]
    for i in range(len(profile)-1):
        for j in range(segments):faces.append((i*segments+j,i*segments+(j+1)%segments,(i+1)*segments+(j+1)%segments,(i+1)*segments+j))
    faces.extend([tuple(range(segments-1,-1,-1)),tuple((len(profile)-1)*segments+j for j in range(segments))])
    return mesh(name,verts,faces,mat)

def parent_keep(obj,parent):
    bpy.context.view_layer.update();matrix=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=matrix;return obj

def empty(name,pos=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=pos
    if parent:parent_keep(o,parent)
    return o

def batch(name,objects=None):
    objects=objects or [o for o in bpy.context.scene.objects if o.type=='MESH']
    if not objects:return
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        bpy.context.view_layer.objects.active=o
        for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
        o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
    # Coalesce duplicate material slots left by joining many leaves/planks.
    old=list(o.data.materials);unique=[]
    for mat in old:
        if mat not in unique:unique.append(mat)
    indices=[unique.index(old[p.material_index]) for p in o.data.polygons]
    o.data.materials.clear()
    for mat in unique:o.data.materials.append(mat)
    for p,index in zip(o.data.polygons,indices):p.material_index=index
    return o

def export_asset(path,batch_geometry=True,save_blend=None):
    bpy.context.view_layer.update()
    if batch_geometry:batch(os.path.basename(path).replace('.glb','').replace('-','_'))
    if save_blend:
        os.makedirs(os.path.dirname(save_blend),exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=save_blend)
    points=[o.matrix_world@Vector(v) for o in bpy.context.scene.objects if o.type=='MESH' for v in o.bound_box]
    os.makedirs(os.path.dirname(path),exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',export_materials='EXPORT',export_apply=True)
    result={'file':os.path.basename(path),'bytes':os.path.getsize(path),'boundsBlender':{'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}}
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    return result
