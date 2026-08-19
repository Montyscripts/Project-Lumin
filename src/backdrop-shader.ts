/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
const vs = `precision highp float;

in vec3 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

const fs = `precision highp float;

out vec4 fragmentColor;

uniform vec2 resolution;
uniform float rand;
uniform float studioLight;

void main() {
  float aspectRatio = resolution.x / resolution.y; 
  vec2 vUv = gl_FragCoord.xy / resolution;
  vUv -= 0.5;
  vUv.x *= aspectRatio;

  float d = length(vUv);

  // High-End Cinema 4D / Octane Studio White-to-Pearl Vignette (when studio lighting is enabled)
  vec3 studioCenter = vec3(0.985, 0.99, 1.0);
  vec3 studioEdge = vec3(0.88, 0.905, 0.94);
  vec3 studioColor = mix(studioCenter, studioEdge, smoothstep(0.15, 1.25, d));

  // Pure dark void: clean pitch black with zero banding or circular ring artifacts
  vec3 darkColor = vec3(0.0, 0.0, 0.0);

  vec3 finalColor = mix(darkColor, studioColor, clamp(studioLight, 0.0, 1.0));
  fragmentColor = vec4(finalColor, 1.0);
}
`;

export {fs, vs};