(() => {
    const canvas   = document.getElementById('three-canvas');
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha:true });
    renderer.setSize(innerWidth, innerHeight);
  
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(6,64,64),
      new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader()
               .load('https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg')
      })
    );
    scene.add(globe);
    camera.position.z = 15;
  
    function animate() {
      requestAnimationFrame(animate);
      globe.rotation.y += 0.0006; // Slower for elegance
      renderer.render(scene, camera);
    }
    animate();
  
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth/innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
  })();
  