/* Orbit overview plus eye-height mouse/touch sky view. */
function bindFountainCamera(scene, canvas, overview) {
    const eye = new BABYLON.UniversalCamera('fountain-eye-camera',new BABYLON.Vector3(0,1.65,-5),scene);
    eye.minZ=.08; eye.maxZ=250; eye.fov=1.1;
    eye.inputs.removeByType('FreeCameraKeyboardMoveInput');
    eye.inputs.removeByType('FreeCameraGamepadInput');
    eye.angularSensibility=1800;
    eye.rotation.set(-.65,0,0);
    let eyeMode=false;
    const button=document.createElement('button');
    button.type='button'; button.className='fountain-camera-toggle';
    button.textContent='☁ Ngước nhìn';
    button.title='Chuyển góc nhìn mặt đất; kéo chuột hoặc vuốt để nhìn quanh';
    button.setAttribute('aria-pressed','false');
    document.body.appendChild(button);
    const positionButton=()=>{
        const bounds=canvas.getBoundingClientRect();
        button.style.left=`${bounds.left+bounds.width/2}px`;
        button.style.top=`${bounds.bottom-45}px`;
    };
    button.addEventListener('click',()=>{
        eyeMode=!eyeMode;
        if(eyeMode){overview.detachControl();eye.attachControl(canvas,true);scene.activeCamera=eye;}
        else {eye.detachControl();overview.attachControl(canvas,true);scene.activeCamera=overview;}
        button.textContent=eyeMode?'↩ Toàn cảnh':'☁ Ngước nhìn';
        button.setAttribute('aria-pressed',String(eyeMode));
    });
    scene.onBeforeRenderObservable.add(()=>{
        positionButton();
        const world=typeof babylonFountain!=='undefined'?babylonFountain:null;
        if(!world)return;
        const me=world.players.get(socket.id);
        if(eyeMode&&me){
            eye.position.set(me.position.x,me.position.y+1.65,me.position.z);
            eye.rotation.x=Math.max(-Math.PI/2+.025,Math.min(Math.PI/2-.025,eye.rotation.x));
        }
        const lookingUp=eyeMode?Math.max(0,Math.min(1,-eye.rotation.x/.8)):0;
        const alpha=1-lookingUp*.95;
        world.players.forEach(root=>{
            root.getChildMeshes().forEach(mesh=>{
                if(mesh._cameraBaseVisibility===undefined)mesh._cameraBaseVisibility=mesh.visibility;
                mesh.visibility=mesh._cameraBaseVisibility*alpha;
            });
            if(root._nameLabel)root._nameLabel.alpha=alpha;
        });
    });
    scene.onDisposeObservable.add(()=>button.remove());
}
