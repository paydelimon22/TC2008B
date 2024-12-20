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
    constructor(id, position=[0,0,0], rotation=[0,0,0], scale=[0.25,0.25,0.25]){
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
let agent_server_running = true;

// Initialize arrays to store agents and map_tiles
let agents = [];
const map_tiles = {};

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
            running: {
                ambient: [0.15, 0.15, 0.1, 1.0],
                diffuse: [1.0, 1.0, 1.0, 1.0],
                specular: [0.75, 0.75, 0.55, 1.0],
            },
            stopped: {
                ambient: [0.1, 0.1, 0.4, 1.0],
                diffuse: [1.0, 1.0, 1.0, 1.0],
                specular: [0.75, 0.75, 0.95, 1.0],
            },
        },
    },
    background: {
        running: [0.25, 0.5, 0.8, 1],
        stopped: [0.033, 0.046, 0.251, 1],
    }
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

    let agent_WebGL = {
        frame: new WebGLObject(assets_arrays.bike_frame),
        wheel: new WebGLObject(assets_arrays.bike_wheel),
    };
    let map_WebGL = {
        tiles: {
            grass: new WebGLObject(assets_arrays.grass),
            road: new WebGLObject(assets_arrays.road),
        },
        traffic_light: new WebGLObject(assets_arrays.traffic_light),
        destination: new WebGLObject(assets_arrays.destination),
        decorators: {
            tile: {
                tree1: new WebGLObject(assets_arrays.tree1),
                tree2: new WebGLObject(assets_arrays.tree2),
                rock1: new WebGLObject(assets_arrays.rock1),
                rock2: new WebGLObject(assets_arrays.rock2),
                trash_can: new WebGLObject(assets_arrays.trash_can),
            },
        },
    };

    // Set up the user interface
    setupUI();

    // Initialize the agents model
    await initAgentsModel();

    // Get the agents and map_tiles
    await getAgents();
    await getMap();

    // Draw the scene
    await drawScene(gl, programInfo, agent_WebGL, map_WebGL);
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
           settings.light.position.x = data.width;
           settings.light.position.z = data.height;
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

            // Create new agents and add them to the agents array
            agents = result.agents.map(
                new_agent => {
                    let agent = new Object3D(
                        new_agent.id, [new_agent.x, new_agent.y, new_agent.z]
                    );

                    switch (new_agent.direction) {
                        case "Right":
                            agent.rotation[1] = Math.PI / 2;
                            break;
                        case "Left":
                            agent.rotation[1] = -Math.PI / 2;
                            break;
                        case "Down":
                            agent.rotation[1] = Math.PI;
                            break;
                    }

                    agent.old_position = [
                        new_agent.x, new_agent.y, new_agent.z
                    ];
                    agent.old_rotation = [
                        agent.rotation[0],
                        agent.rotation[1],
                        agent.rotation[2],
                    ];

                    let old_agent = agents.find(
                        old_a => old_a.id == new_agent.id
                    );

                    if (old_agent != undefined) {
                        agent.old_position = [
                            old_agent.position[0],
                            old_agent.position[1],
                            old_agent.position[2],
                        ];
                        agent.old_rotation = [
                            old_agent.rotation[0],
                            old_agent.rotation[1],
                            old_agent.rotation[2],
                        ];
                        let diff_rot = agent.old_rotation[1] - agent.rotation[1];
                        if (diff_rot > Math.PI) {
                            agent.old_rotation[1] -= 2 * Math.PI;
                        } else if (diff_rot < -Math.PI) {
                            agent.old_rotation[1] += 2 * Math.PI;
                        }
                    }

                    return agent;
                }
            );
            // Log the agents array
            console.log("Agents:", agents)
        }

    } catch (error) {
        // Log any errors that occur during the request
        console.log(error)
    }
}

/*
 * Retrieves the current positions of all map_tiles from the agent server.
 */
async function getMap() {
    try {
        // Send a GET request to the agent server to retrieve the
        // map_tile positions
        let response = await fetch(agent_server_uri + "getMap")

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json()

            // Create new map_tiles and add them to the map_tiles array
            console.log("Got Map:", result.map);
            for (const tile_type in result.map) {
                map_tiles[tile_type] = result.map[tile_type].map(
                    tile => new Object3D(tile.id, [tile.x, tile.y, tile.z])
                );
            }
            map_tiles.traffic_lights.map(
                (traffic_light, index) => {
                    switch (result.map.traffic_lights[index].direction) {
                        case "Left":
                            traffic_light.rotation[1] = Math.PI / 2;
                            break;
                        case "Right":
                            traffic_light.rotation[1] = -Math.PI / 2;
                            break;
                        case "Up":
                            traffic_light.rotation[1] = Math.PI;
                            break;
                    }
                }
            );
            map_tiles.obstacles.map(
                obstacle => {
                    let random = Math.random();
                    const tree_chance = 0.65
                    const rock_chance = 0.2
                    const trash_can_chance = 0.05
                    if (random < tree_chance) {
                        if (random < tree_chance / 2) {
                            obstacle.decorator = "tree1";
                        } else {
                            obstacle.decorator = "tree2";
                        }
                        return
                    }
                    random -= tree_chance
                    if (random < rock_chance) {
                        if (random < rock_chance / 2) {
                            obstacle.decorator = "rock1";
                        } else {
                            obstacle.decorator = "rock2";
                        }
                        return
                    }
                    random -= rock_chance
                    if (random < trash_can_chance) {
                        obstacle.decorator = "trash_can";
                        return
                    }
                }
            );
            // Log the map_tiles array
            console.log("Map:", map_tiles);
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
            let result = await response.json();

            if (!result.running) {
                agent_server_running = false;
                console.error("SIMULATION ENDED!",
                              "No more updates will be requested.");
                return
            }

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
 * Draws the scene by rendering the agents and map_tiles.
 *
 * @param {WebGLRenderingContext} gl - The WebGL rendering context.
 * @param {Object} programInfo - The program information.
 * @param {WebGLVertexArrayObject} agentsVao - The vertex array object for agents.
 * @param {Object} agentsBufferInfo - The buffer information for agents.
 * @param {WebGLVertexArrayObject} map_tilesVao - The vertex array object for map_tiles.
 * @param {Object} map_tilesBufferInfo - The buffer information for map_tiles.
 */
async function drawScene(gl, programInfo, agent_WebGL, map_WebGL) {
    // Resize the canvas to match the display size
    twgl.resizeCanvasToDisplaySize(gl.canvas);

    // Set the viewport to match the canvas size
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Set the clear color and enable depth testing
    if (agent_server_running) {
        gl.clearColor(...settings.background.running);
    } else {
        gl.clearColor(...settings.background.stopped);
    }
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

    let light_colors;
    if (agent_server_running) {
        light_colors = settings.light.color.running;
    } else {
        light_colors = settings.light.color.stopped;
    }

    const globalUniforms = {
        u_viewWorldPosition: v3_cameraPosition,
        u_lightWorldPosition: v3_lightPosition,
        u_ambientLight: light_colors.ambient,
        u_diffuseLight: light_colors.diffuse,
        u_specularLight: light_colors.specular,
    };

    twgl.setUniforms(programInfo, globalUniforms);

    // Draw the agents
    drawAgents(distance, agent_WebGL, viewProjectionMatrix);
    // Draw the map_tiles
    drawMap(distance, map_WebGL, viewProjectionMatrix);

    // Increment the frame count
    frameCount++

    // Update the scene every 30 frames
    if (agent_server_running && frameCount % 30 == 0) {
        frameCount = 0;
        await update();
    }

    // Request the next frame
    requestAnimationFrame(
        () => drawScene(
            gl, programInfo, agent_WebGL, map_WebGL
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
        const agent_old_pos = twgl.v3.create(...agent.old_position);
        const agent_new_pos = twgl.v3.create(...agent.position);
        const agent_lerp_pos = twgl.v3.lerp(
            agent_old_pos, agent_new_pos, frameCount / 30
        );
        const vertical_offset = twgl.v3.create(0, 0.25, 0);
        const agent_trans = twgl.v3.add(
            agent_lerp_pos, vertical_offset
        );
        const agent_scale = twgl.v3.create(...agent.scale);

        const agent_old_rot = twgl.v3.create(...agent.old_rotation);
        const agent_new_rot = twgl.v3.create(...agent.rotation);
        const agent_lerp_rot = twgl.v3.lerp(
            agent_old_rot, agent_new_rot, frameCount / 30
        );
        let diff_rot = agent.old_rotation[1] - agent.rotation[1];

        // Calculate the agent's matrix
        agent.matrix = twgl.m4.translate(twgl.m4.identity(), agent_trans);
        agent.matrix = twgl.m4.rotateX(agent.matrix, agent_lerp_rot[0]);
        agent.matrix = twgl.m4.rotateY(agent.matrix, agent_lerp_rot[1]);
        agent.matrix = twgl.m4.rotateZ(agent.matrix, agent_lerp_rot[2]);
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
            let wheel_trans = twgl.v3.create(0, 0, 0.3);
            if (i == 1) {
                wheel_trans = twgl.v3.negate(wheel_trans);
            };

            let wheel_rotation = 2 * Math.PI * frameCount / 30
            if (twgl.v3.distance(agent_old_pos, agent_new_pos) == 0) {
                wheel_rotation = 0;
            }

            // Calculate the wheel's matrix
            let wheel_matrix = twgl.m4.translate(twgl.m4.identity(), agent_trans);
            wheel_matrix = twgl.m4.rotateX(wheel_matrix, agent_lerp_rot[0]);
            wheel_matrix = twgl.m4.rotateY(wheel_matrix, agent_lerp_rot[1]);
            wheel_matrix = twgl.m4.rotateZ(wheel_matrix, agent_lerp_rot[2]);
            wheel_matrix = twgl.m4.translate(wheel_matrix, wheel_trans);
            wheel_matrix = twgl.m4.rotateX(wheel_matrix, wheel_rotation);
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
 * Draws the map_tiles.
 *
 * @param {Number} distance - The distance for rendering.
 * @param {WebGLVertexArrayObject} map_tilesVao - The vertex array object for map_tiles.
 * @param {Object} map_tilesBufferInfo - The buffer information for map_tiles.
 * @param {Float32Array} viewProjectionMatrix - The view-projection matrix.
 */
function drawMap(distance, map_WebGL, viewProjectionMatrix) {
    // Iterate over the map_tiles
    for (const tile_type in map_tiles) {
        let model;
        switch (tile_type) {
            case "obstacles":
                model = map_WebGL.tiles.grass;
                break;
            case "roads":
                model = map_WebGL.tiles.road;
                break;
            case "traffic_lights":
                model = map_WebGL.traffic_light;
                break;
            case "destinations":
                model = map_WebGL.destination;
                break;
        }

        let tile_decorators = map_WebGL.decorators.tile;

        for (const tile of map_tiles[tile_type]) {
            // Create the map_tile's transformation matrix
            const tile_trans = twgl.v3.create(...tile.position);
            const tile_scale = twgl.v3.create(...tile.scale);

            // Calculate the tile's matrix
            tile.matrix = twgl.m4.translate(
                twgl.m4.identity(), tile_trans
            );
            tile.matrix = twgl.m4.rotateX(
                tile.matrix, tile.rotation[0]
            );
            tile.matrix = twgl.m4.rotateY(
                tile.matrix, tile.rotation[1]
            );
            tile.matrix = twgl.m4.rotateZ(
                tile.matrix, tile.rotation[2]
            );
            tile.matrix = twgl.m4.scale(tile.matrix, tile_scale);

            const tile_worldViewProjection = twgl.m4.multiply(
                viewProjectionMatrix, tile.matrix
            );

            // Set the uniforms for the tile
            let uniforms = {
                u_world: tile.matrix,
                u_worldInverseTransform: twgl.m4.identity(),
                u_worldViewProjection: tile_worldViewProjection,
            }

            // Bind the vertex array object for tiles
            gl.bindVertexArray(model.vao);
            // Set the uniforms and draw the tile
            twgl.setUniforms(programInfo, uniforms);
            twgl.drawBufferInfo(gl, model.buffer_info);

            if (tile_type == "obstacles" && tile.decorator
                && !map_tiles.destinations.find(
                    destination => destination.position.every(
                        (pos, index) => pos == tile.position[index]
                    )
                )
            ) {
                gl.bindVertexArray(tile_decorators[tile.decorator].vao);
                twgl.drawBufferInfo(
                    gl, tile_decorators[tile.decorator].buffer_info
                );
            };
        }
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
