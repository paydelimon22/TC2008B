'use strict';

import * as twgl from 'twgl.js';
import GUI from 'lil-gui';

// Import the vertex shader code, using GLSL 3.00
import vsGLSL from "./shaders/vs_phong.glsl?raw";

// Import the fragment shader code, using GLSL 3.00
import fsGLSL from "./shaders/fs_phong.glsl?raw";

// Import the asset arrays from loader module.
import assets_arrays from "./assets/load_obj";

// Define the Object3D class to represent 3D objects
class Object3D {
    constructor(id, position=[0,0,0], rotation=[0,0,0], scale=[1,1,1]){
        this.id = id;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.matrix = twgl.m4.create();
    }
}

class WebGLObject {
    constructor(arrays) {
        this.arrays = arrays;
        this.buffer_info = twgl.createBufferInfoFromArrays(
            gl, this.arrays
        );
        this.vao = twgl.createVAOFromBufferInfo(
            gl, programInfo, this.buffer_info
        );
    }
}

// Define the agent server URI
const agent_server_uri = "http://localhost:8585/";

// Initialize arrays to store agents and obstacles
const agents = [];
const obstacles = [];

// Initialize WebGL-related variables
let gl, programInfo;

// General visualization settings
const settings = {
    // Camera information for visualization perspective.
    camera: {
        position: {
            x: 0,
            y: 0,
            z: 0,
        },
        rotation: {
            x: 35,
            y: 45,
        },
        scale: {
            r: 1
        },
    },
    light: {
        position: {
            x: 0,
            y: 50,
            z: 0,
        },
        color: {
            ambient: [0.1, 0.1, 0.1, 1.0],
            diffuse: [1.0, 1.0, 1.0, 1.0],
            specular: [0.75, 0.75, 0.75, 1.0],
        },
    },
};

// Initialize the frame count
let frameCount = 0;

// Define the data object
const data = {
    width: undefined,
    height: undefined
};

// Main function to initialize and run the application
async function main() {
    const canvas = document.querySelector('canvas');
    gl = canvas.getContext('webgl2');

    // Create the program information using the vertex and fragment shaders
    programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

    let bike_agent = {
        frame: new WebGLObject(assets_arrays.bike_frame),
        wheel: new WebGLObject(assets_arrays.bike_wheel),
    };
    let tiles = {
        grass: new WebGLObject(assets_arrays.grass),
        road: new WebGLObject(assets_arrays.road),
    };
    let decorators = {
        tile: {
            tree1: new WebGLObject(assets_arrays.tree1),
            tree2: new WebGLObject(assets_arrays.tree2),
        },
    };

    // Set up the user interface
    setupUI();

    // Initialize the agents model
    await initAgentsModel();

    // Get the agents and obstacles
    await getAgents();
    await getObstacles(decorators.tile);

    // Draw the scene
    await drawScene(gl, programInfo, bike_agent, tiles.grass, decorators.tile);
}

/*
 * Initializes the agents model by sending a POST request to the agent server.
 */
async function initAgentsModel() {
    try {
        // Send a POST request to the agent server to initialize the model
        let response = await fetch(agent_server_uri + "init")

        // Check if the response was successful
        if (response.ok) {
           // Parse the response as JSON and log the message
           let result = await response.json()
           console.log(result.message)
           data.width = result.width;
           data.height = result.height;
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.log(error)
    }
}

/*
 * Retrieves the current positions of all agents from the agent server.
 */
async function getAgents() {
    try {
        // Send a GET request to the agent server to retrieve the agent positions
        let response = await fetch(agent_server_uri + "getAgents")

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json()

            // Log the agent positions
            console.log(result.positions)

            // Check if the agents array is empty
            if (agents.length == 0) {
                // Create new agents and add them to the agents array
                for (const agent of result.positions) {
                    const newAgent = new Object3D(
                        agent.id, [agent.x, agent.y, agent.z]
                    );
                    agents.push(newAgent)
                }
                // Log the agents array
                console.log("Agents:", agents)
            } else {
                // Update the positions of existing agents
                for (const agent of result.positions) {
                    const current_agent = agents.find(
                        (object3d) => object3d.id == agent.id
                    );

                    // Check if the agent exists in the agents array
                    if(current_agent != undefined){
                        // Update the agent's position
                        current_agent.position = [agent.x, agent.y, agent.z]
                    }
                }
            }
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error)
    }
}

/*
 * Retrieves the current positions of all obstacles from the agent server.
 */
async function getObstacles(decorators_WebGL) {
    try {
        // Send a GET request to the agent server to retrieve the
        // obstacle positions
        let response = await fetch(agent_server_uri + "getObstacles")

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json()

            // Create new obstacles and add them to the obstacles array
            for (const obstacle of result.positions) {
                const newObstacle = new Object3D(
                    obstacle.id, [obstacle.x, obstacle.y, obstacle.z]
                );
                if (Math.random() < 0.5) {
                    newObstacle.decorator = "tree1";
                } else {
                    newObstacle.decorator = "tree2";
                }
                obstacles.push(newObstacle)
            }
            // Log the obstacles array
            console.log("Obstacles:", obstacles)
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.log(error)
    }
}

/*
 * Updates the agent positions by sending a request to the agent server.
 */
async function update() {
    try {
        // Send a request to the agent server to update the agent positions
        let response = await fetch(agent_server_uri + "update")

        // Check if the response was successful
        if (response.ok) {
            // Retrieve the updated agent positions
            await getAgents()
            // Log a message indicating that the agents have been updated
            console.log("Updated agents")
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.log(error)
    }
}

/*
 * Draws the scene by rendering the agents and obstacles.
 *
 * @param {WebGLRenderingContext} gl - The WebGL rendering context.
 * @param {Object} programInfo - The program information.
 * @param {WebGLVertexArrayObject} agentsVao - The vertex array object for agents.
 * @param {Object} agentsBufferInfo - The buffer information for agents.
 * @param {WebGLVertexArrayObject} obstaclesVao - The vertex array object for obstacles.
 * @param {Object} obstaclesBufferInfo - The buffer information for obstacles.
 */
async function drawScene(
    gl, programInfo, agent_WebGL, obstacle_WebGL, decorators_WebGL
) {
    // Resize the canvas to match the display size
    twgl.resizeCanvasToDisplaySize(gl.canvas);

    // Set the viewport to match the canvas size
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Set the clear color and enable depth testing
    gl.clearColor(0.2, 0.2, 0.2, 1);
    gl.enable(gl.DEPTH_TEST);

    // Clear the color and depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // WebGL cull faces
    gl.enable(gl.CULL_FACE);

    // Use the program
    gl.useProgram(programInfo.program);

    // Set up the view-projection matrix
    const viewProjectionMatrix = setupWorldView(gl);

    // Set the distance for rendering
    const distance = 1

    // Global uniforms
    const v3_lightPosition = twgl.v3.create(
        settings.light.position.x,
        settings.light.position.y,
        settings.light.position.z,
    );
    const v3_cameraPosition = twgl.v3.create(
        settings.camera.position.x,
        settings.camera.position.y,
        settings.camera.position.z,
    );

    const globalUniforms = {
        u_viewWorldPosition: v3_cameraPosition,
        u_lightWorldPosition: v3_lightPosition,
        u_ambientLight: settings.light.color.ambient,
        u_diffuseLight: settings.light.color.diffuse,
        u_specularLight: settings.light.color.specular,
    };

    twgl.setUniforms(programInfo, globalUniforms);

    // Draw the agents
    drawAgents(distance, agent_WebGL, viewProjectionMatrix);
    // Draw the obstacles
    drawObstacles(
        distance, obstacle_WebGL, decorators_WebGL, viewProjectionMatrix
    );

    // Increment the frame count
    frameCount++

    // Update the scene every 30 frames
    if (frameCount % 30 == 0) {
        frameCount = 0
        await update()
    }

    // Request the next frame
    requestAnimationFrame(
        () => drawScene(
            gl, programInfo, agent_WebGL, obstacle_WebGL, decorators_WebGL
        )
    );
}

/*
 * Draws the agents.
 *
 * @param {Number} distance - The distance for rendering.
 * @param {WebGLVertexArrayObject} agentsVao - The vertex array object for agents.
 * @param {Object} agentsBufferInfo - The buffer information for agents.
 * @param {Float32Array} viewProjectionMatrix - The view-projection matrix.
 */
function drawAgents(
    distance, agent_WebGL, viewProjectionMatrix
) {
    // Iterate over the agents
    for (const agent of agents) {
        // Draw the bike frame
        // Bind the vertex array object for bike_frame
        gl.bindVertexArray(agent_WebGL.frame.vao);

        // Create the agent's transformation matrix
        const agent_trans = twgl.v3.add(
            twgl.v3.create(...agent.position), twgl.v3.create(0, 0.25, 0)
        );
        const agent_scale = twgl.v3.create(...agent.scale.map(x => 0.4 * x));

        // Calculate the agent's matrix
        agent.matrix = twgl.m4.translate(twgl.m4.identity(), agent_trans);
        agent.matrix = twgl.m4.rotateX(agent.matrix, agent.rotation[0]);
        agent.matrix = twgl.m4.rotateY(agent.matrix, agent.rotation[1]);
        agent.matrix = twgl.m4.rotateZ(agent.matrix, agent.rotation[2]);
        agent.matrix = twgl.m4.scale(agent.matrix, agent_scale);

        const agent_worldViewProjection = twgl.m4.multiply(
            viewProjectionMatrix, agent.matrix
        );

        // Set the uniforms for the agent bike_frame
        let uniforms = {
            u_world: agent.matrix,
            u_worldInverseTransform: twgl.m4.identity(),
            u_worldViewProjection: agent_worldViewProjection,
        }

        // Set the uniforms and draw the agent
        twgl.setUniforms(programInfo, uniforms);
        twgl.drawBufferInfo(gl, agent_WebGL.frame.buffer_info);

        // Draw the wheels
        // Bind the vertex array object for bike_wheel
        gl.bindVertexArray(agent_WebGL.wheel.vao);

        for (let i = 0; i < 2; i++) {
            // Create the wheel's transformation matrix
            let wheel_trans = twgl.v3.create(0, 0, 0.5);
            if (i == 1) {
                wheel_trans = twgl.v3.negate(wheel_trans);
            };

            // Calculate the wheel's matrix
            let wheel_matrix = twgl.m4.translate(twgl.m4.identity(), agent_trans);
            wheel_matrix = twgl.m4.translate(wheel_matrix, wheel_trans);
            wheel_matrix = twgl.m4.rotateX(wheel_matrix, agent.rotation[0]);
            wheel_matrix = twgl.m4.rotateY(wheel_matrix, agent.rotation[1]);
            wheel_matrix = twgl.m4.rotateZ(wheel_matrix, agent.rotation[2]);
            wheel_matrix = twgl.m4.scale(wheel_matrix, agent_scale);

            const wheel_worldViewProjection = twgl.m4.multiply(
                viewProjectionMatrix, wheel_matrix
            );

            let wheel_uniforms = {
                u_world: wheel_matrix,
                u_worldInverseTransform: twgl.m4.identity(),
                u_worldViewProjection: wheel_worldViewProjection,
            };

            // Set the uniforms and draw the wheel
            twgl.setUniforms(programInfo, wheel_uniforms);
            twgl.drawBufferInfo(gl, agent_WebGL.wheel.buffer_info);
        }
    }
}


/*
 * Draws the obstacles.
 *
 * @param {Number} distance - The distance for rendering.
 * @param {WebGLVertexArrayObject} obstaclesVao - The vertex array object for obstacles.
 * @param {Object} obstaclesBufferInfo - The buffer information for obstacles.
 * @param {Float32Array} viewProjectionMatrix - The view-projection matrix.
 */
function drawObstacles(
    distance, obstacle_WebGL, decorators_WebGL, viewProjectionMatrix
) {
    // Iterate over the obstacles
    for(const obstacle of obstacles){
        // Create the obstacle's transformation matrix
        const obstacle_trans = twgl.v3.create(...obstacle.position);
        const obstacle_scale = twgl.v3.create(
            ...obstacle.scale.map(x => 0.4 * x)
        );

        // Calculate the obstacle's matrix
        obstacle.matrix = twgl.m4.translate(
            twgl.m4.identity(), obstacle_trans
        );
        obstacle.matrix = twgl.m4.rotateX(
            obstacle.matrix, obstacle.rotation[0]
        );
        obstacle.matrix = twgl.m4.rotateY(
            obstacle.matrix, obstacle.rotation[1]
        );
        obstacle.matrix = twgl.m4.rotateZ(
            obstacle.matrix, obstacle.rotation[2]
        );
        obstacle.matrix = twgl.m4.scale(obstacle.matrix, obstacle_scale);

        const obstacle_worldViewProjection = twgl.m4.multiply(
            viewProjectionMatrix, obstacle.matrix
        );

        // Set the uniforms for the obstacle
        let uniforms = {
            u_world: obstacle.matrix,
            u_worldInverseTransform: twgl.m4.identity(),
            u_worldViewProjection: obstacle_worldViewProjection,
        }

        // Bind the vertex array object for obstacles
        gl.bindVertexArray(obstacle_WebGL.vao);
        // Set the uniforms and draw the obstacle
        twgl.setUniforms(programInfo, uniforms);
        twgl.drawBufferInfo(gl, obstacle_WebGL.buffer_info);

        // Bind the decorator arrays to be drawn
        gl.bindVertexArray(decorators_WebGL[obstacle.decorator].vao);
        twgl.drawBufferInfo(gl, decorators_WebGL[obstacle.decorator].buffer_info);
    }
}

/*
 * Sets up the world view by creating the view-projection matrix.
 *
 * @param {WebGLRenderingContext} gl - The WebGL rendering context.
 * @returns {Float32Array} The view-projection matrix.
 */
function setupWorldView(gl) {
    // Set the field of view (FOV) in radians
    const fov = 60 * Math.PI / 180;

    // Calculate the aspect ratio of the canvas
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    // Create the projection matrix
    const projectionMatrix = twgl.m4.perspective(fov, aspect, 1, 200);

    // Set the target position
    const target = [data.width / 2, 0, data.height / 2];

    // Set the up vector
    const up = [0, 1, 0];

    // Calculate the camera position
    const cam_v3_trans = twgl.v3.create(0, 0, 50);
    const cam_traMat = twgl.m4.translation(cam_v3_trans);

    // Calculate the camera rotation
    const cam_rotXMat = twgl.m4.rotationX(
        -settings.camera.rotation.x * Math.PI / 180
    );
    const cam_rotYMat = twgl.m4.rotationY(
        (settings.camera.rotation.y - 180) * Math.PI / 180
    );

    // Calculate the camera distance (scale)
    const cam_v3_scale = twgl.v3.create(
        settings.camera.scale.r,
        settings.camera.scale.r,
        settings.camera.scale.r,
    );
    const cam_scaleMat = twgl.m4.scaling(cam_v3_scale);

    // Calculate the pivot translation
    const cam_v3_pivot_trans = twgl.v3.create(data.width/2, 0, data.height/2);
    const cam_pivotMat = twgl.m4.translation(cam_v3_pivot_trans);

    // Create the camera matrix
    let cameraMatrix = twgl.m4.identity();
    cameraMatrix = twgl.m4.multiply(cam_traMat, cameraMatrix);
    cameraMatrix = twgl.m4.multiply(cam_scaleMat, cameraMatrix);
    cameraMatrix = twgl.m4.multiply(cam_rotXMat, cameraMatrix);
    cameraMatrix = twgl.m4.multiply(cam_rotYMat, cameraMatrix);
    cameraMatrix = twgl.m4.multiply(cam_pivotMat, cameraMatrix);

    // Update camera position in 3D space
    let camPos = twgl.m4.getTranslation(cameraMatrix);
    settings.camera.position.x = camPos[0];
    settings.camera.position.y = camPos[1];
    settings.camera.position.z = camPos[2];

    // Calculate the view matrix
    const viewMatrix = twgl.m4.inverse(cameraMatrix);

    // Calculate the view-projection matrix
    const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);

    // Return the view-projection matrix
    return viewProjectionMatrix;
}

/*
 * Sets up the user interface (UI) for the camera position.
 */
function setupUI() {
    // Create a new GUI instance
    const gui = new GUI();

    // Create a folder for the camera rotation
    const rotFolder = gui.addFolder("Camera Rotation:");

    // Add a slider for the x-axis
    rotFolder.add(settings.camera.rotation, 'x', 0, 90)
        .onChange( value => {
            // Update the camera position when the slider value changes
            settings.camera.rotation.x = value
        });

    // Add a slider for the y-axis
    rotFolder.add( settings.camera.rotation, 'y', -180, 180)
        .onChange( value => {
            // Update the camera position when the slider value changes
            settings.camera.rotation.y = value
        });

    // Create a folder for the camera distance
    const distFolder = gui.addFolder("Camera Distance:");

    // Add a slider for the distance
    distFolder.add( settings.camera.scale, "r", 0, 1)
        .onChange( value => {
            // Update the camera distance when the slider value changes
            settings.camera.scale.r = value
        });
}

main()
