/* Joint-based gait: thighs carry knees, shins, cuffs and shoes together. */
function bindStudentAnimation(root, model) {
    const joints=new Map();
    for(const node of model.getDescendants()) {
        const jointName=node.name.slice(node.name.lastIndexOf(':')+1);
        if(!/^student_(hip|knee|shoulder|elbow)_(left|right)$/.test(jointName))continue;
        const rest=node.rotationQuaternion?node.rotationQuaternion.toEulerAngles():node.rotation.clone();
        node.rotationQuaternion=null;node.rotation.copyFrom(rest);
        joints.set(jointName,{node,rest});
    }
    let phase=0,blend=0;
    const angles=new Map();
    const pose=(name,target,dt)=>{
        const joint=joints.get('student_'+name);if(!joint)return;
        const value=(angles.get(name)||0)+(target-(angles.get(name)||0))*(1-Math.exp(-18*dt));
        angles.set(name,value);joint.node.rotation.x=joint.rest.x+value;
    };
    return (dt,distance,walking,seated)=>{
        blend+=(Number(walking&&!seated)-blend)*(1-Math.exp(-15*dt));
        if(walking&&!seated)phase+=Math.min(distance,.4)*Math.PI*2/1.5;
        for(const side of ['left','right']) {
            const wave=Math.sin(phase+(side==='left'?0:Math.PI));
            pose('hip_'+side,seated?-1.5:wave*.50*blend,dt);
            pose('knee_'+side,seated?1.48:Math.max(0,-wave)*.65*blend,dt);
            pose('shoulder_'+side,seated?-.15:-wave*.32*blend,dt);
            pose('elbow_'+side,seated?-.28:-.10*blend,dt);
        }
        if(!seated)root.position.y=Math.abs(Math.sin(phase))*.018*blend;
    };
}
