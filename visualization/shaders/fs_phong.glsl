#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_cameraDirection;
in vec3 v_lightDirection;

//Import colour constants from the vertex shader
in vec4 v_ambientColor;
in vec4 v_diffuseColor;
in vec4 v_specularColor;
in float v_shininess;

uniform vec4 u_ambientLight;
uniform vec4 u_diffuseLight;
uniform vec4 u_specularLight; 

out vec4 outColor;

void main() {

    //Ambient component
    vec4 ambient = u_ambientLight * v_ambientColor;

    //Diffuse component
    vec3 normalVector = normalize(v_normal);
    vec3 lightVector = normalize(v_lightDirection);
    float lambert = dot(normalVector, lightVector);
    vec4 diffuse = vec4(0,0,0,1);
    if(lambert > 0.0){
        diffuse = u_diffuseLight * v_diffuseColor * lambert;
    }

    //Specular component
    vec3 camera_v = normalize(v_cameraDirection);
    vec3 parallel_v = normalVector * lambert;
    vec3 perpendicular_v = lightVector - parallel_v;
    vec3 reflect_v = parallel_v - perpendicular_v;

    float spec = pow(dot(camera_v, reflect_v), v_shininess);
    vec4 specular = vec4(0,0,0,1);

    if (spec > 0.0){
        specular = v_specularColor * u_specularLight * spec;
    }

    outColor = ambient + diffuse + specular;
}