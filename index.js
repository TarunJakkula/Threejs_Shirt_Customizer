document.addEventListener("DOMContentLoaded", async function () {
  const canvas2D = new fabric.Canvas("2d", { preserveObjectStacking: true });
  const canvas3D = document.getElementById("3d");
  let selectedObject = null;
  canvas2D.backgroundColor = "transparent";
  canvas2D.selection = false;
  const color = document.getElementById("box");

  const replaceWithTextButton = document.getElementById("replaceWithText");
  const uploadInput = document.getElementById("upload");
  const div = document.getElementById("editing");
  const deleteButton = document.getElementById("delete");

  if (!selectedObject) {
    div.style.display = "none";
  }

  let svgArray = { array: await svgs() };
  const activeIndex = { index: 0 };

  addSvg(canvas2D, svgArray, activeIndex); // Pass canvas2D to addSvg function

  await Initialize2D(canvas2D, updateCanvasDimensions, svgArray.array[0]);

  // let fabricImageUrl = captureDataToUrl(canvas2D);
  await Initialize3D(canvas3D, svgArray);

  function updateCanvasDimensions() {
    canvas2D.setWidth(window.innerWidth * 0.19);
    canvas2D.setHeight(window.innerWidth * 0.26);
    canvas2D.renderAll();
  }

  function changeDim() {
    updateCanvasDimensions();
    const svgObjects = canvas2D.getObjects();
    if (svgObjects.length === 0) return;
    const svgObject = new fabric.Group(svgObjects);
    const scaleX = canvas2D.width / svgObject.width;
    const scaleY = canvas2D.height / svgObject.height;
    svgObject.set({ scaleX, scaleY });
    canvas2D.clear();
    svgObject._restoreObjectsState();
    svgObject._objects.forEach((obj) => (obj.svgElement = true));
    canvas2D.add(...svgObject._objects);
    canvas2D.renderAll();
  }

  window.addEventListener("resize", changeDim);

  canvas2D.on("mouse:down", (event) => {
    const target = canvas2D.findTarget(event.e);
    const box = document.getElementById("swatch");
    if (target) {
      selectedObject = target;

      box.style.display = "flex";
      if (selectedObject.id && selectedObject.id.startsWith("Edit")) {
        div.style.display = "flex";
      } else {
        div.style.display = "none";
      }
      canvas2D.renderAll();
    } else {
      box.style.display = "none";
    }
  });

  canvas2D.on("mouse:over", (event) => {
    if (event.target && event.target.svgElement) {
      canvas2D.hoverCursor = "pointer";
    }
  });

  canvas2D.on("mouse:out", (event) => {
    if (event.target && !event.target.svgElement) {
      canvas2D.hoverCursor = "default";
    }
  });

  // Event handlers
  color.addEventListener("change", function () {
    updateColors(
      canvas2D,
      canvas3D,
      color,
      selectedObject,
      svgArray,
      activeIndex
    );
  });

  replaceWithTextButton.addEventListener("click", function () {
    const text = prompt("Enter text:");
    if (text)
      replaceWithText(
        canvas2D,
        canvas3D,
        selectedObject,
        text,
        activeIndex,
        svgArray
      );
  });

  uploadInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const imageUrl = event.target.result;
        replaceWithImageFromUrl(
          canvas2D,
          canvas3D,
          selectedObject,
          imageUrl,
          svgArray,
          activeIndex
        );
      };
      reader.readAsDataURL(file);
    }
  });

  deleteButton.addEventListener("click", function () {
    if (selectedObject)
      selectedObject = deleteElement(
        canvas2D,
        canvas3D,
        selectedObject,
        div,
        svgArray,
        activeIndex
      );
  });
});

function svgs() {
  return new Promise((resolve, reject) => {
    let svgElements = Array(5).fill();

    const paths = [
      "/public/svgs/blue_color-02-01-02.svg",
      "/public/svgs/blue_color-02-01-03.svg",
      "/public/svgs/blue_color-02-01-04.svg",
      "/public/svgs/blue_color-02-01-05.svg",
      "/public/svgs/blue_color-02-01-06.svg",
    ];

    const fetchPromises = paths.map((svgPath, index) => {
      return fetch(svgPath)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${svgPath}`);
          }
          return response.text();
        })
        .then((svgText) => {
          svgElements[index] = svgText;
        })
        .catch((error) => {
          console.error("Error fetching SVG:", error);
          reject(error); // Reject promise on error
        });
    });

    Promise.all(fetchPromises)
      .then(() => {
        resolve(svgElements); // Resolve with svgElements array when all fetches are done
      })
      .catch((error) => {
        console.error("Error fetching SVGs:", error);
        reject(error); // Reject promise if any fetch fails
      });
  });
}

function svgAdder(canvas2D, svgArray, activeIndex) {
  const div = document.getElementById("allSvg");
  svgArray.array.forEach((svgText, index) => {
    const svgContainer = document.createElement("div");
    svgContainer.classList.add("svg-container");
    svgContainer.setAttribute("id", "Svg" + (index + 1));
    const img = document.createElement("img");
    const svgDataUrl = captureDataToUrl(svgText);
    img.src = svgDataUrl;
    svgContainer.appendChild(img);
    div.appendChild(svgContainer);
    svgContainer.addEventListener("click", function () {
      renderSvgToCanvas(canvas2D, svgText);
      activeIndex.index = index;
    });
  });
}

const addSvg = (canvas2D, svgArray, activeIndex) =>
  svgAdder(canvas2D, svgArray, activeIndex);

function updateSvgContainers(canvas2D, svgArray, activeIndex) {
  document.getElementById("allSvg").innerHTML = "";
  svgAdder(canvas2D, svgArray, activeIndex);
}

function renderSvgToCanvas(canvas, svgText) {
  fabric.loadSVGFromString(svgText, function (objects, options) {
    if (objects.length === 1) {
      // Handle single object SVG
      const svgObject = objects[0];
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const scaleX = canvasWidth / svgObject.width;
      const scaleY = canvasHeight / svgObject.height;

      svgObject.set({
        scaleX,
        scaleY,
        svgElement: true, // Mark as SVG element if needed for mouse events
      });

      canvas.clear();
      canvas.add(svgObject);
      canvas.forEachObject((obj) => {
        obj.hasControls = false;
        obj.lockMovementX = true;
        obj.lockMovementY = true;
      });
      return;
    }
    const svgObject = fabric.util.groupSVGElements(objects, options);
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    const scaleX = canvasWidth / options.width;
    const scaleY = canvasHeight / options.height;
    svgObject.set({
      scaleX,
      scaleY,
    });
    svgObject._restoreObjectsState();
    svgObject._objects.forEach((obj) => (obj.svgElement = true));

    canvas.clear();
    canvas.add(...svgObject._objects);
    canvas.forEachObject((obj) => {
      obj.hasControls = false;
      obj.lockMovementX = true;
      obj.lockMovementY = true;
    });

    canvas.renderAll();
  });
}

function Initialize2D(canvas, updateCanvasDimensions, svgText) {
  updateCanvasDimensions();

  return new Promise((resolve, reject) => {
    fabric.loadSVGFromString(svgText, function (objects, options) {
      const svgObject = fabric.util.groupSVGElements(objects, options);
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const scaleX = canvasWidth / options.width;
      const scaleY = canvasHeight / options.height;
      svgObject.set({
        scaleX,
        scaleY,
      });

      svgObject._restoreObjectsState();
      svgObject._objects.forEach((obj) => (obj.svgElement = true));

      canvas.add(...svgObject._objects);
      canvas.forEachObject((obj) => {
        obj.hasControls = false;
        obj.lockMovementX = true;
        obj.lockMovementY = true;
      });

      canvas.renderAll();
      resolve();
    });
  });
}

function Initialize3D(canvas, svgArray) {
  return new Promise((resolve, reject) => {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setClearColor(0xf4f3f9);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      200
    );
    camera.position.z = 20;
    camera.position.y = 3;

    const list = { 11004: 4, 11: 0, 11001: 1, 11003: 3, 11002: 2 };

    const targetPosition = new THREE.Vector3(0, 3, 0);

    let shirtGroup;
    const loader = new THREE.FBXLoader();
    loader.load(
      "./public/blue jersey single.fbx",
      function (object) {
        shirtGroup = object; // Assign the loaded group to shirtGroup
        shirtGroup.traverse(function (child) {
          if (child.isMesh) {
            const textureLoader = new THREE.TextureLoader();
            const fabricTexture = textureLoader.load(
              captureDataToUrl(svgArray.array[list[child.name]])
            );
            const material = new THREE.MeshStandardMaterial({
              map: fabricTexture,
            });

            child.material = material; // Set material for each mesh in the group
            child.castShadow = true;
          }
        });

        // Scale and position the entire group
        shirtGroup.scale.set(0.01, 0.01, 0.01);
        scene.add(shirtGroup); // Add the group to the scene

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 0, 6.4);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const spotLight = new THREE.SpotLight(0xffffff, 0.5);
        spotLight.position.set(0, 6, 14);
        spotLight.distance = 20;
        spotLight.castShadow = true;

        // Add the spotlight to the scene
        scene.add(spotLight);

        const pointLight1 = new THREE.PointLight(0xffffff, 0.5, 2000);
        pointLight1.position.set(3.6, 2.72, 0);
        const pointLight2 = new THREE.PointLight(0xffffff, 0.5, 2000);
        pointLight2.position.set(-3.6, 6.72, 0);

        const pointLight3 = new THREE.PointLight(0xffffff, 0.5, 2000);
        pointLight3.position.set(0, 4.84, -7.46);

        scene.add(pointLight1);
        scene.add(pointLight2);
        scene.add(pointLight3);

        // Resize renderer to display size
        function resizeRendererToDisplaySize() {
          const width = canvas.clientWidth;
          const height = canvas.clientHeight;

          if (canvas.width !== width || canvas.height !== height) {
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
          }
        }

        // Animation loop
        function animate() {
          requestAnimationFrame(animate);
          resizeRendererToDisplaySize();
          shirtGroup.rotation.y += 0.009;
          camera.lookAt(targetPosition);
          if (renderer && scene && camera) {
            renderer.render(scene, camera);
          }
        }

        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        canvas.addEventListener("mousedown", (event) => {
          isDragging = true;
          previousMousePosition = {
            x: event.clientX,
            y: event.clientY,
          };
        });

        canvas.addEventListener("mouseup", () => {
          isDragging = false;
        });

        canvas.addEventListener("mousemove", (event) => {
          if (isDragging && shirtGroup) {
            const deltaX = event.clientX - previousMousePosition.x;
            shirtGroup.rotation.y += deltaX * 0.01;
            previousMousePosition = {
              x: event.clientX,
              y: event.clientY,
            };
          }
        });

        // Add event listener for window resize
        window.addEventListener("resize", resizeRendererToDisplaySize);
        canvas.scene = scene;
        canvas.shirtGroup = shirtGroup; // Expose shirtGroup on the canvas
        animate(); // Start the animation loop
        resolve();
      },
      undefined,
      (error) => {
        reject(error);
      }
    );
  });
}

function getSvgText(canvas) {
  let svgString = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvas.width}" height="${canvas.height}">`;
  const svgObjects = canvas.getObjects();

  svgObjects.forEach((obj) => {
    let objSVG = obj.toSVG();
    // Replace xlink:href with href
    // objSVG = objSVG.replace(/xlink:href/g, "href");
    svgString += objSVG;
  });

  svgString += "</svg>";
  return svgString;
}

const captureDataToUrl = (svgText) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;

function updateshirtTexture(canvas, svgArray) {
  const scene = canvas.scene;
  const shirtGroup = canvas.shirtGroup;
  const list = { 11004: 4, 11: 0, 11001: 1, 11003: 3, 11002: 2 };
  if (scene && shirtGroup) {
    shirtGroup.traverse(function (child) {
      if (child.isMesh) {
        const textureLoader = new THREE.TextureLoader();
        const fabricTexture = textureLoader.load(
          captureDataToUrl(svgArray.array[list[child.name]])
        );
        child.material.map = fabricTexture;
        child.material.needsUpdate = true;
      }
    });
  } else {
    console.error("Scene or shirt not initialized correctly.");
  }
}

function replaceWithText(
  canvas2D,
  canvas3D,
  object,
  text,
  activeIndex,
  svgArray,
  options = {}
) {
  if (object) {
    const originalWidth = object.width * object.scaleX;
    const originalHeight = object.height * object.scaleY;

    // Set default text properties and override with options
    const {
      fontSize = 30,
      fontFamily = "Times New Roman",
      fontWeight = "bold",
      fill = "white",
      stroke = null,
      strokeWidth = 1,
      textAlign = "center",
      originX = "center",
      originY = "center",
    } = options;

    // Create a temporary text object to measure the text
    const tempText = new fabric.Text(text, {
      fontWeight,
      fill,
      fontSize,
      fontFamily,
      stroke,
      strokeWidth,
      textAlign,
      originX,
      originY,
    });

    // Calculate the scaling factor to fit the text within the original object's dimensions
    const scaleX = originalWidth / tempText.width;
    const scaleY = originalHeight / tempText.height;
    const scale = Math.min(scaleX, scaleY);

    // Create the new text object with adjusted properties
    const newText = new fabric.Text(text, {
      left: object.left + originalWidth / 2, // Centered horizontally
      top: object.top + originalHeight / 2, // Centered vertically
      fill,
      fontSize,
      fontWeight,
      fontFamily,
      stroke,
      strokeWidth,
      textAlign,
      originX,
      originY,
      scaleX: scale,
      scaleY: scale,
      hasControls: false,
      lockMovementX: true,
      lockMovementY: true,
    });

    // Remove the original object and add the new text object
    canvas2D.remove(object);
    canvas2D.add(newText);
    canvas2D.renderAll();

    svgArray.array[activeIndex.index] = getSvgText(canvas2D);
    updateSvgContainers(canvas2D, svgArray, activeIndex);
    updateshirtTexture(canvas3D, svgArray);
  }
}

function replaceWithImageFromUrl(
  canvas2D,
  canvas3D,
  object,
  imageUrl,
  svgArray,
  activeIndex
) {
  if (object) {
    fabric.Image.fromURL(imageUrl, function (img) {
      img.set({
        left: object.left,
        top: object.top,
        scaleX: (object.scaleX * object.width) / img.width,
        scaleY: (object.scaleY * object.height) / img.height,
        id: "Edit",
      });
      img.hasControls = false;
      img.lockMovementX = true;
      img.lockMovementY = true;
      canvas2D.remove(object);
      canvas2D.add(img);
      canvas2D.renderAll();
      svgArray.array[activeIndex.index] = getSvgText(canvas2D);
      updateSvgContainers(canvas2D, svgArray, activeIndex);
      updateshirtTexture(canvas3D, svgArray);
    });
  }
}

function updateColors(
  canvas2D,
  canvas3D,
  color,
  object,
  svgArray,
  activeIndex
) {
  if (object) {
    object.set("fill", `${color.value}`);
    canvas2D.renderAll();
    svgArray.array[activeIndex.index] = getSvgText(canvas2D);
    updateSvgContainers(canvas2D, svgArray, activeIndex);
    updateshirtTexture(canvas3D, svgArray);
  }
}

function deleteElement(canvas2D, canvas3D, object, div, svgArray, activeIndex) {
  canvas2D.remove(object);
  canvas2D.renderAll();
  div.style.display = "none";
  svgArray.array[activeIndex.index] = getSvgText(canvas2D);
  updateSvgContainers(canvas2D, svgArray, activeIndex);
  updateshirtTexture(canvas3D, svgArray);
}
