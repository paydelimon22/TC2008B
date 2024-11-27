/*
Module used to generate a dictionary with all the assets necessary as an array for  WebGL to interpret
*/

// ###### Import Bike models and materials #####
// ------ Bike Frame -----
import obj_bike_frame from "./Bike/Bike_Frame/bike_frame.obj?raw";
import mtl_bike_frame from "./Bike/Bike_Frame/bike_frame.mtl?raw";
// ----- Bike Wheel -----
import obj_bike_wheel from "./Bike/Bike_Wheel/bike_wheel.obj?raw";
import mtl_bike_wheel from "./Bike/Bike_Wheel/bike_wheel.mtl?raw";

// ##### Tiles objects and materials #####
// ----- Grass -----
import obj_grass from "./Tiles/Grass/grass.obj?raw";
import mtl_grass from "./Tiles/Grass/grass.mtl?raw";
// ----- Road -----
import obj_road from "./Tiles/Road/road.obj?raw";
import mtl_road from "./Tiles/Road/road.mtl?raw";

// ##### Import the destination model and material #####
import obj_destination from "./Destination/destination.obj?raw";
import mtl_destination from "./Destination/destination.mtl?raw";

// ##### Traffic Lights object and material #####
import obj_traffic_light from "./Traffic_Light/traffic_light.obj?raw";
import mtl_traffic_light from "./Traffic_Light/traffic_light.mtl?raw";

// ##### Import the decorators #####
//  ===== Tile decorators =====
//  ----- Trees -----
import obj_tree1 from "./Decorators/Tile/Tree/tree1.obj?raw";
import obj_tree2 from "./Decorators/Tile/Tree/tree2.obj?raw";
import mtl_tree from "./Decorators/Tile/Tree/tree.mtl?raw";
//  ----- Rocks -----
import obj_rock1 from "./Decorators/Tile/Rock/rock1.obj?raw";
import obj_rock2 from "./Decorators/Tile/Rock/rock2.obj?raw";
import mtl_rock from  "./Decorators/Tile/Rock/rock.mtl?raw";
//  ----- Trash Cans -----
import obj_trash_can from "./Decorators/Tile/Trash_Can/trash_can.obj?raw";
import mtl_trash_can from "./Decorators/Tile/Trash_Can/trash_can.mtl?raw";
// ===== Scalable decorators =====
// ----- Basketball Court -----
import obj_basketball_court from "./Decorators/Scalable/Basketball_Court/basketball_court.obj?raw";
import mtl_basketball_court from "./Decorators/Scalable/Basketball_Court/basketball_court.mtl?raw";
// ----- Football Field -----
import obj_football_field from "./Decorators/Scalable/Football_Field/football_field.obj?raw";
import mtl_football_field from "./Decorators/Scalable/Football_Field/football_field.mtl?raw";
//  ----- Fountain -----
import obj_fountain from "./Decorators/Scalable/Fountain/fountain.obj?raw";
import mtl_fountain from "./Decorators/Scalable/Fountain/fountain.mtl?raw";

let assets_arrays = {
    // ##### Bike arrays ######
    // ----- Frame array ------
    bike_frame: parse_obj(obj_bike_frame, mtl_bike_frame),
    // ----- Wheel array ------
    bike_wheel: parse_obj(obj_bike_wheel, mtl_bike_wheel),
    // ##### Tiles arrays ######
    // ----- Grass array ------
    grass: parse_obj(obj_grass, mtl_grass),
    // ----- Road array -----
    road: parse_obj(obj_road, mtl_road),
    // ##### Road array ######
    destination: parse_obj(obj_destination, mtl_destination),
    // ##### Traffic light array #####
    traffic_light: parse_obj(obj_traffic_light, mtl_traffic_light),
    // ##### Decorators arrays #####
    // ===== Tile decorators =====
    // ----- Tree arrays -----
    tree1: parse_obj(obj_tree1, mtl_tree),
    tree2: parse_obj(obj_tree2, mtl_tree),
    // ----- Rock arrays -----
    rock1: parse_obj(obj_rock1, mtl_rock),
    rock2: parse_obj(obj_rock2, mtl_rock),
    // ----- Trash can array -----
    trash_can: parse_obj(obj_trash_can, mtl_trash_can),
    // ====== Scalable decorators =====
    // ------ Basketball Court array -----
    basketball_court: parse_obj(obj_basketball_court, mtl_basketball_court),
    // ------ Football Field array -----
    football_field: parse_obj(obj_football_field, mtl_football_field),
    // ------ Fountain array -----
    fountain: parse_obj(obj_fountain, mtl_fountain),
};

function parse_obj(object, mtl_file) {
    const myobject = {
        a_position: {
            num_components: 3,
            data: []
        },
        a_ambientColor: {
            numComponents: 4,
            data: []
        },
        a_specularColor: {
            numComponents: 4,
            data: []
        },
        a_diffuseColor: {
            numComponents: 4,
            data: []
        },
        a_shininess:{
            numComponents: 1,
            data: []
        },
        a_normal: {
            numComponents: 3,
            data: []
        },
        a_texCoord: {
            numComponents: 2,
            data: []
        }
    };

    const vertices = [];
    const texCoords = [];
    const normals = [];
    let materials = parse_mtllib(mtl_file);
    let material = null;

    const file_lines = object.split("\n");

    for (const line of file_lines) {
        const line_elements = line.split(" ");

        switch(line_elements[0]) {
            case "v":
                vertices.push(line_elements.slice(1,4).map(parseFloat));
                break;
            case "vn":
                normals.push(line_elements.slice(1,4).map(parseFloat));
                break;
            case "vt":
                texCoords.push(line_elements.slice(1,4).map(parseFloat));
                break;
            case "f":
                const faceVertices = line_elements.slice(1, 4);
                for (const vertex of faceVertices) {
                    const [vIdx, vtIdx, vnIdx] = vertex.split('/')
                        .map(num => parseInt(num) - 1);
                    if (!isNaN(vIdx)) {
                        myobject.a_position.data.push(...vertices[vIdx]);
                    }
                    if (!isNaN(vtIdx)) {
                        myobject.a_texCoord.data.push(...texCoords[vtIdx]);
                    }
                    if (!isNaN(vnIdx)) {
                        myobject.a_normal.data.push(...normals[vnIdx]);
                    }

                    myobject.a_ambientColor.data.push(...material.ambient, 1);
                    myobject.a_diffuseColor.data.push(...material.diffuse, 1);
                    myobject.a_specularColor.data.push(...material.specular, 1);
                    myobject.a_shininess.data.push(material.shininess);
                }
                break;
            case "usemtl":
                material = materials[line_elements[1]];
            default:
                break;
        }
    }
    return myobject;
}

function parse_mtllib(mtl_file) {
    let materials = new Object();
    const material_blocks = mtl_file.split("\n\n");
    material_blocks.shift();
    for (const material_block of material_blocks) {

        const material_lines = material_block.split("\n");

        materials[material_lines[0].split(" ")[1]] = {
            shininess: parseFloat(material_lines[1].split(" ")[1])/100,
            ambient: material_lines[2].split(" ").slice(1, 4).map(parseFloat),
            diffuse: material_lines[3].split(" ").slice(1, 4).map(parseFloat),
            specular: material_lines[4].split(" ").slice(1, 4).map(parseFloat)
        }
    }
    return materials;
}

export default assets_arrays;
