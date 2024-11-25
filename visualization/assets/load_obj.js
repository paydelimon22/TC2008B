/*
Module used to generate a dictionary with all the assets necessary as an array for  WebGL to interpret
*/

import obj_basketball_court from "./assets/Obstacles/basketball_court.obj?raw";
import obj_bike from "./assets/Bike/bike.obj?raw";
import obj_destination from "./assets/destination.obj?raw";
import obj_football_field from "./assets/Obstacles/football_field.obj?raw";
import obj_fountain from "./assets/Obstacles/fountain.obj?raw";
import obj_grass from "./assets/grass.obj?raw";
import obj_rock1 from "./assets/Obstacles/rock1.obj?raw";
import obj_rock2 from "./assets/Obstacles/rock2.obj?raw";
import obj_road from "./assets/road.obj?raw";
import obj_traffic_light from "./assets/traffic_light.obj?raw";
import obj_trash_can from "./assets/Obstacles/trash_can.obj?raw";
import obj_tree1 from "./assets/Obstacles/tree1.obj?raw";
import obj_tree2 from "./assets/Obstacles/tree2.obj?raw";
import obj_wheel from "./assets/Bike/wheel.obj?raw";

import mtl_basketball_court from "./assets/Obstacles/basketball_court.mtl?raw";
import mtl_bike from "./assets/Bike/bike.mtl?raw";
import mtl_destination from "./assets/destination.mtl?raw";
import mtl_football_field from "./assets/Obstacles/football_field.mtl?raw";
import mtl_fountain from "./assets/Obstacles/fountain.mtl?raw";
import mtl_grass from "./assets/grass.mtl?raw";
import mtl_rock from  "./assets/Obstacles/rock.mtl?raw";
import mtl_road from "./assets/road.mtl?raw";
import mtl_traffic_light from "./assets/traffic_light.mtl?raw";
import mtl_trash_can from "./assets/Obstacles/trash_can.mtl?raw";
import mtl_tree from "./assets/Obstacles/tree.mtl?raw";
import mtl_wheel from "./assets/Bike/wheel.mtl?raw";

let assets = {
    basketball_court: {data: [parse_obj(obj_basketball_court, mtl_basketball_court)]},
    bike: {data: [parse_obj(obj_bike, mtl_bike)]},
    destination: {data: [parse_obj(obj_destination, mtl_destination)]},
    football_field: {data: [parse_obj(obj_football_field, mtl_football_field)]},
    fountain: {data: [parse_obj(obj_fountain, mtl_fountain)]},
    grass: {data: [parse_obj(obj_grass, mtl_grass)]},
    rock1: {data: [parse_obj(obj_rock1, mtl_rock)]},
    rock2: {data: [parse_obj(obj_rock2, mtl_rock)]},
    road: {data: [parse_obj(obj_road, mtl_road)]},
    traffic_light: {data: [parse_obj(obj_traffic_light, mtl_traffic_light)]},
    trash_can: {data: [parse_obj(obj_trash_can, mtl_trash_can)]},
    tree1: {data: [parse_obj(obj_tree1, mtl_tree)]},
    tree2: {data: [parse_obj(obj_tree2, mtl_tree)]},
    wheel: {data: [parse_obj(obj_wheel, mtl_wheel)]},
};

export default function get_object_arrays(object) {
    let arrays;
    switch (object) {
        case "bike":
            arrays = assets.bike.data[0]
            console.log("BIKE: ", arrays);
            return arrays;
        case "basketball_court":
            return assets.basketball_court.data;
        case "destination":
            return assets.destination.data;
        case "football_field":
            return assets.football_field.data;
        case "fountain":
            return assets.fountain.data;
        case "grass":
            return assets.grass.data;
        case "rock1":
            return assets.rock1.data;
        case "rock2":
            return assets.rock2.data;
        case "road":
            return assets.road.data;
        case "traffic_light":
            return assets.traffic_light.data;
        case "trash_can":
            return assets.trash_can.data;
        case "tree1":
            return assets.tree1.data;
        case "tree2":
            return assets.tree2.data;
        case "wheel":
            return assets.wheel.data;
        default:
            return null; 
    }
}

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
