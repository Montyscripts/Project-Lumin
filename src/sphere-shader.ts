/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
const vs = `#define STANDARD
varying vec3 vViewPosition;
varying float vDisplacement;
#ifdef USE_TRANSMISSION
  varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

uniform float time;
uniform float globalTime;
uniform float idleStrength;
uniform float morphingEnabled;
uniform float isSphere;

uniform float mercuryProgress;
uniform float mercuryFluidity;
uniform float mercurySheen;
uniform float mercuryTime;

uniform float gradientBevelProgress;
uniform float gradientBevelSheen;

uniform vec4 inputData;
uniform vec4 outputData;

// Simplex 3D Noise by Ian McEwan, Ashima Arts
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}


vec3 calc( vec3 pos ) {
  vec3 dir = normalize( pos );
  
  // Noise parameters based on audio frequencies
  float total_bass = inputData.x + outputData.x;
  float total_mid = inputData.y + outputData.y;
  float total_treble = inputData.z + outputData.z;
  
  // Classic audio noise parameters
  float noise_freq_1 = 2.0;
  float noise_amp_1 = 0.2 * total_bass;
  float noise_flow_1 = time * 0.2;
  
  float noise_freq_2 = 5.0;
  float noise_amp_2 = 0.1 * total_mid;
  float noise_flow_2 = time * 0.5;

  float noise_freq_3 = 12.0;
  float noise_amp_3 = 0.05 * total_treble;
  float noise_flow_3 = time * 0.8;

  // Classic displacement
  float classic_displacement = 
      (noise_amp_1 * snoise(pos * noise_freq_1 + noise_flow_1) +
      noise_amp_2 * snoise(pos * noise_freq_2 + noise_flow_2) +
      noise_amp_3 * snoise(pos * noise_freq_3 + noise_flow_3));

  // Dynamic Mercury Metal / Fluid Adamantium Morphing
  float m_time = mercuryTime * mercuryFluidity;
  vec3 m_pos = pos * 1.6;
  
  vec3 eddy = vec3(
    snoise(m_pos + vec3(0.0, m_time * 0.3, 1.5)),
    snoise(m_pos + vec3(2.1, 0.0, m_time * 0.3)),
    snoise(m_pos + vec3(m_time * 0.3, 3.2, 0.0))
  );
  
  float m_wave1 = snoise(m_pos * 1.3 + eddy * 0.65 + m_time * 0.45) * 0.16;
  float m_wave2 = snoise(m_pos * 3.4 - eddy * 0.35 + m_time * 0.65) * (0.07 + 0.12 * total_mid);
  float m_wave3 = snoise(m_pos * 8.5 + m_time * 1.2) * (0.02 + 0.06 * total_treble);
  float bass_pulse = sin(length(pos) * 3.8 - m_time * 1.8) * (total_bass * 0.22);
  
  float mercury_displacement = (m_wave1 + m_wave2 + m_wave3 + bass_pulse);

  // Blend displacements seamlessly based on mercuryProgress and gradientBevelProgress
  float baseMorphDisplacement = mix(
    classic_displacement * morphingEnabled,
    mercury_displacement * (0.45 + 0.55 * morphingEnabled),
    mercuryProgress
  );

  // In C4D Gradient Bevel mode, keep geometries (sphere, cube, pyramid) pristine and sharp while retaining delicate acoustic pulsation
  float bevelDisplacement = (sin(length(pos) * 2.5 - time * 1.2) * (total_bass * 0.035 * morphingEnabled)
    + (snoise(pos * 2.0 + time * 0.3) * 0.012 * total_mid * morphingEnabled)) * (0.3 + 0.7 * isSphere);

  float actualDisplacement = mix(baseMorphDisplacement, bevelDisplacement, gradientBevelProgress);

  vec3 audio_disp = dir * actualDisplacement;
  vDisplacement = actualDisplacement;

  // Idle animation: High-speed, multi-axis rotation with precession (wobble)
  float fast_spin = globalTime * 2.0;
  float slow_wobble = globalTime * 0.3;
  
  // Create rotation matrices
  mat3 rot_y_fast = mat3(
    cos(fast_spin), 0.0, sin(fast_spin),
    0.0, 1.0, 0.0,
    -sin(fast_spin), 0.0, cos(fast_spin)
  );

  mat3 rot_x_wobble = mat3(
    1.0, 0.0, 0.0,
    0.0, cos(slow_wobble), -sin(slow_wobble),
    0.0, sin(slow_wobble), cos(slow_wobble)
  );

  mat3 rot_z_precession = mat3(
    cos(slow_wobble * 0.5), -sin(slow_wobble * 0.5), 0.0,
    sin(slow_wobble * 0.5), cos(slow_wobble * 0.5), 0.0,
    0.0, 0.0, 1.0
  );
  
  vec3 rotated_pos = rot_z_precession * rot_x_wobble * rot_y_fast * pos;

  // Apply idle transformations, blending them in smoothly
  vec3 mixed_pos = mix(pos, rotated_pos, idleStrength);
  
  // For the sphere, we must normalize the interpolation path so it doesn't shrink during rotation.
  // For other shapes (cube/pyramid), interpolating rotation vectors will warp flat edges.
  // We completely bypass shader-based wobble for non-spheres and let the JavaScript rotate the mesh itself.
  vec3 sphere_idle_pos = length(mixed_pos) > 0.001 ? normalize(mixed_pos) * length(pos) : pos;
  vec3 idle_pos = mix(pos, sphere_idle_pos, isSphere); 

  return idle_pos + audio_disp;
}

void main() {
  #include <uv_vertex>
  #include <color_vertex>
  #include <morphinstance_vertex>
  #include <morphcolor_vertex>
  #include <batching_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <normal_vertex>
  #include <begin_vertex>

  vec3 np = calc( position );
  
  // Normal calculation with finite differences for liquid fluid deformation
  float eps = 0.008;
  vec3 tangent1 = normalize(vec3(-position.y, position.x + 0.0001, 0.001));
  vec3 bitangent1 = cross(normalize(position + 0.0001), tangent1);
  vec3 p1 = calc(position + tangent1 * eps);
  vec3 p2 = calc(position + bitangent1 * eps);
  vec3 computedNormal = normalize(cross(p1 - np, p2 - np));
  
  vec3 fluidNormal = length(computedNormal) > 0.5 ? computedNormal : normalize(np);
  vec3 finalNormal = mix(normalize(np), fluidNormal, mercuryProgress * 0.75);

  transformedNormal = normalMatrix * finalNormal;

  vNormal = normalize( transformedNormal );

  transformed = np;

  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <displacementmap_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  vViewPosition = - mvPosition.xyz;
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>
  #ifdef USE_TRANSMISSION
    vWorldPosition = worldPosition.xyz;
  #endif
}
`;

export {vs};
