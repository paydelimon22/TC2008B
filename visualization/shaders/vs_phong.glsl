#version 300 es

in vec4 a_position;
in vec3 a_normal;

//Shader has to receive colour constants
in vec4 a_ambientColor;
in vec4 a_diffuseColor;
in vec4 a_specularColor;
in float a_shininess;

uniform vec3 u_viewWorldPosition;
uniform vec3 u_lightWorldPosition;

uniform mat4 u_world;
uniform mat4 u_worldInverseTransform;
uniform mat4 u_worldViewProjection;

out vec3 v_normal;
out vec3 v_cameraDirection;
out vec3 v_lightDirection;

//Passes colour constants to the fragment shader
out vec4 v_ambientColor;
out vec4 v_diffuseColor;
out vec4 v_specularColor;
out float v_shininess;

void main() {
    gl_Position = u_worldViewProjection * a_position;

    v_normal = mat3(u_worldInverseTransform) * a_normal;

    vec3 transformedPosition = (u_world * a_position).xyz;

    v_lightDirection = u_lightWorldPosition - transformedPosition;
    v_cameraDirection = u_viewWorldPosition - transformedPosition;

    v_ambientColor = a_ambientColor;
    v_diffuseColor = a_diffuseColor;
    v_specularColor = a_specularColor;
    v_shininess = a_shininess;
}