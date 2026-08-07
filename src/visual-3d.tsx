
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, PropertyValues, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {Analyser} from './analyser';

import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {AfterimagePass} from 'three/addons/postprocessing/AfterimagePass.js';
import {FilmPass} from 'three/addons/postprocessing/FilmPass.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RGBShiftShader} from 'three/addons/shaders/RGBShiftShader.js';
import {fs as backdropFS, vs as backdropVS} from './backdrop-shader';
import {vs as sphereVS} from './sphere-shader';

const FLOWER_OF_LIFE_CENTERS = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0.5, Math.sqrt(3)/2, 0),
  new THREE.Vector3(-0.5, Math.sqrt(3)/2, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(-0.5, -Math.sqrt(3)/2, 0),
  new THREE.Vector3(0.5, -Math.sqrt(3)/2, 0),
  new THREE.Vector3(2, 0, 0),
  new THREE.Vector3(1.5, Math.sqrt(3)/2, 0),
  new THREE.Vector3(1, Math.sqrt(3), 0),
  new THREE.Vector3(0, Math.sqrt(3), 0),
  new THREE.Vector3(-1, Math.sqrt(3), 0),
  new THREE.Vector3(-1.5, Math.sqrt(3)/2, 0),
  new THREE.Vector3(-2, 0, 0),
  new THREE.Vector3(-1.5, -Math.sqrt(3)/2, 0),
  new THREE.Vector3(-1, -Math.sqrt(3), 0),
  new THREE.Vector3(0, -Math.sqrt(3), 0),
  new THREE.Vector3(1, -Math.sqrt(3), 0),
  new THREE.Vector3(1.5, -Math.sqrt(3)/2, 0),
];

const VESICA_PISCIS_CENTERS = [
  new THREE.Vector3(-0.6, 0, 0),
  new THREE.Vector3(0.6, 0, 0),
];

// Source for the custom fragment shader logic to create the "cosmic nebula" idle effect.
const fragmentShaderSource = `
  varying float vDisplacement;
  uniform float idleStrength;
  uniform float globalTime;
  uniform float time;
  uniform vec3 activeEmissiveColor;
  uniform float morphingEnabled;

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
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Fractal Brownian Motion
  float fbm(vec3 p) {
    float f = 0.0;
    mat3 m = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
    f += 0.5000 * snoise(p); p = m * p * 2.02;
    f += 0.2500 * snoise(p); p = m * p * 2.03;
    f += 0.1250 * snoise(p); p = m * p * 2.01;
    f += 0.0625 * snoise(p);
    return f / 0.9375;
  }

  vec3 cosmic_color(vec3 normal, float time, vec3 baseColor, float displacement) {
      // Adjust scale so patterns appear larger and more defined
      vec3 p = normal * 1.0;
      
      // Add a moderate rotation to the coordinates for a swirling effect
      float c = cos(time * 0.2);
      float s = sin(time * 0.2);
      mat3 rot = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
      p = rot * p;
      
      // Domain warping: use a low-frequency noise to distort the coordinates
      // Add displacement to the warp to make the fluid react to audio
      float warp = fbm(p + time * 0.2 + displacement * 2.0);
      
      // Displace the coordinates using the warp value and time
      // Add a continuous upward drift to the sampling coordinates so the glow appears to drift downward like a lava lamp
      vec3 p2 = p + vec3(warp) * 1.0 + vec3(time * 0.1, time * 0.25, time * 0.06);
      
      // Final noise value, mapped from [-1, 1] to [0, 1] to prevent half-sphere bias
      float n = fbm(p2) * 0.5 + 0.5;

      // Calculate perceived brightness to balance bright themes (like Emerald Matrix)
      float luma = dot(baseColor, vec3(0.299, 0.587, 0.114));
      float scale = 1.0 / max(luma * 1.8, 1.0);
      vec3 balancedColor = baseColor * scale;

      // Swirling nebula colors based on the balanced theme color
      vec3 color1 = balancedColor * 0.15; // Deeper shadows for contrast
      vec3 color2 = balancedColor * 0.5; // Mid shade
      vec3 color3 = balancedColor * 1.0; // Bright highlight without hue shift
      
      // Smooth mixing based on the fluid noise
      float mix1 = smoothstep(0.1, 0.6, n);
      vec3 final_color = mix(color1, color2, mix1);
      
      float mix2 = smoothstep(0.4, 0.9, n);
      final_color = mix(final_color, color3, mix2);
      
      // Add a subtle highlight to the flowing edges
      float highlight = smoothstep(0.6, 0.8, n) - smoothstep(0.8, 1.0, n);
      final_color += baseColor * highlight * 0.5;
      
      // Boost intensity based on audio displacement
      final_color *= 1.0 + max(0.0, displacement * 1.5);
      
      return final_color;
  }
`;

/**
 * 3D live audio visual.
 */
@customElement('gdm-live-audio-visuals-3d')
export class GdmLiveAudioVisuals3D extends LitElement {
  @property({type: Number}) rotationSpeed = 1.0;
  @property({type: Boolean}) rotationLocked = false;
  @property({type: Number}) metalness = 0.1;
  @property({type: Number}) roughness = 0.7;
  @property({type: Boolean}) autoPanEnabled = true;
  @property({type: Number}) autoPanSpeed = 1.0;
  @property({type: Number}) directionalLightIntensity = 1.2;
  @property({type: Number}) ambientLightIntensity = 0.15;
  @property({type: String}) particleShape = 'saturn';

  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private camera!: THREE.PerspectiveCamera;
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private backdrop!: THREE.Mesh;
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private afterimagePass!: AfterimagePass;
  private chromaticAberrationPass!: ShaderPass;
  private filmPass!: FilmPass;
  private sphere!: THREE.Mesh;
  private dPR = 1.0;
  private resizeObserver: ResizeObserver | null = null;
  private isLoopRunning = false;
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private onWindowResizeBound?: () => void;
  private lastFrameTime = 0;
  private prevTime = 0;
  private visualizerTime = 0;
  private visualizerRotationTime = 0;
  private visualizerRotationY = 0;
  private rotation = new THREE.Vector3(0, 0, 0);
  private idleEffectStrength = 1.0;
  private smoothedEnergy = 0;
  private smoothedInputData = new THREE.Vector3();
  private smoothedOutputData = new THREE.Vector3();

  // Particle system properties
  private particles!: THREE.Points;
  private particleGeometry!: THREE.BufferGeometry;
  private readonly PARTICLE_COUNT = 3000;
  private particlesData: {
    velocity: THREE.Vector3;
    originalColor: THREE.Color;
    // Parameters for Möbius strip path
    mobiusU: number; // Angle along the strip
    mobiusV: number; // Position across the strip's width
  }[] = [];

  @property({type: Number}) cameraRotX = 0;
  @property({type: Number}) cameraRotY = 0;
  @property({type: Number}) cameraZoomMult = 1.0;
  @property({type: Boolean}) cameraLocked = false;

  private isPointerDown = false;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private targetUserRotX = 0;
  private targetUserRotY = 0;
  private userRotX = 0;
  private userRotY = 0;
  private targetUserZoomMult = 1.0;
  private userZoomMult = 1.0;
  private smoothedPulseBase = 0;

  private _outputNode!: AudioNode;

  @property()
  set outputNode(node: AudioNode) {
    if (this.outputAnalyser && this._outputNode) {
      try {
        this.outputAnalyser.disconnect(this._outputNode);
      } catch (e) {}
    }
    this._outputNode = node;
    if (node) {
      this.outputAnalyser = new Analyser(this._outputNode);
    }
  }

  get outputNode() {
    return this._outputNode;
  }

  private _inputNode!: AudioNode;

  @property()
  set inputNode(node: AudioNode) {
    if (this.inputAnalyser && this._inputNode) {
      try {
        this.inputAnalyser.disconnect(this._inputNode);
      } catch (e) {}
    }
    this._inputNode = node;
    if (node) {
      this.inputAnalyser = new Analyser(this._inputNode);
    }
  }

  get inputNode() {
    return this._inputNode;
  }

  @property({type: Number}) particleSize = 0.06;
  @property({type: String}) visualizerShape = 'sphere';
  @property({type: Number}) visualizerSize = 1.5;
  @property({type: Number}) visualizerSpeed = 1.0;
  @property({type: Number}) particleSpeed = 1.0;
  @property({type: Number}) bloomIntensity = 1.5;
  @property({type: Number}) bloomRadius = 0.4;
  @property({type: Number}) bloomThreshold = 0.0;
  @property({type: Array}) themeGlowColors: string[] = ['#00aaff'];
  @property({type: Array}) themeParticleColors: string[] = [];
  @property({type: Boolean}) afterimageEnabled = true;
  @property({type: Number}) afterimageStrength = 0.85;
  @property({type: Boolean}) chromaticAberrationEnabled = true;
  @property({type: Number}) chromaticAberrationIntensity = 0.005;
  @property({type: Boolean}) morphingEnabled = false;
  @property({type: Number}) morphingIntensity = 1.0;
  @property({type: Boolean}) filmGrainEnabled = false;
  @property({type: Number}) filmGrainIntensity = 0.35;
  @property({type: Number}) glowPulseStrength = 0.0;
  @property({type: Number}) themeTransitionSpeed = 1.0;
  @property({type: Boolean}) isActive = false;
  @property({type: Boolean}) isSpeaking = false;
  @property({type: Boolean}) showParticles = true;
  @property({type: Boolean}) showMainVisualizer = true;
  @property({type: Number}) globalScale = 1.0;
  @property({type: String}) backdropTextureUrl: string | null = null;

  private canvas!: HTMLCanvasElement;
  private lastSoundTime: number = 0;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
      outline: none;
      display: block;
    }
  `;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has('cameraRotX')) {
      this.targetUserRotX = this.cameraRotX;
    }
    if (changedProperties.has('cameraRotY')) {
      this.targetUserRotY = this.cameraRotY;
    }
    if (changedProperties.has('cameraZoomMult')) {
      this.targetUserZoomMult = this.cameraZoomMult;
    }

    if (changedProperties.has('metalness') && this.sphere) {
      (this.sphere.material as THREE.MeshStandardMaterial).metalness = this.metalness;
    }
    if (changedProperties.has('roughness') && this.sphere) {
      (this.sphere.material as THREE.MeshStandardMaterial).roughness = this.roughness;
    }
    if (changedProperties.has('ambientLightIntensity') && this.ambientLight) {
      this.ambientLight.intensity = this.ambientLightIntensity;
    }
    if (changedProperties.has('directionalLightIntensity') && this.directionalLight) {
      this.directionalLight.intensity = this.directionalLightIntensity;
    }
    if (changedProperties.has('particleSize') && this.particles) {
      (this.particles.material as THREE.PointsMaterial).size =
        this.particleSize;
    }
    if (changedProperties.has('showParticles') && this.particles) {
      this.particles.visible = this.showParticles;
    }
    if (changedProperties.has('showMainVisualizer') && this.sphere) {
      this.sphere.visible = this.showMainVisualizer;
    }
    if (this.bloomPass) {
      if (changedProperties.has('bloomRadius')) {
        this.bloomPass.radius = this.bloomRadius;
      }
      if (changedProperties.has('bloomThreshold')) {
        this.bloomPass.threshold = this.bloomThreshold;
      }
    }
    if (this.afterimagePass) {
      if (changedProperties.has('afterimageEnabled')) {
        this.afterimagePass.enabled = this.afterimageEnabled;
      }
      if (changedProperties.has('afterimageStrength')) {
        this.afterimagePass.uniforms['damp'].value = this.afterimageStrength;
      }
    }
    if (this.chromaticAberrationPass) {
      if (changedProperties.has('chromaticAberrationEnabled')) {
        this.chromaticAberrationPass.enabled = this.chromaticAberrationEnabled;
      }
      if (changedProperties.has('chromaticAberrationIntensity')) {
        this.chromaticAberrationPass.uniforms['amount'].value =
          this.chromaticAberrationIntensity;
      }
    }
    if (this.filmPass) {
      if (changedProperties.has('filmGrainEnabled')) {
        this.filmPass.enabled = this.filmGrainEnabled;
      }
      if (changedProperties.has('filmGrainIntensity')) {
        this.filmPass.uniforms['intensity'].value = this.filmGrainIntensity;
      }
    }
    if ((changedProperties.has('morphingEnabled') || changedProperties.has('morphingIntensity')) && this.sphere) {
      const uniforms = (this.sphere.material as THREE.MeshStandardMaterial).userData.shader?.uniforms;
      if (uniforms) uniforms.morphingEnabled.value = this.morphingEnabled ? this.morphingIntensity : 0.0;
    }
    if (changedProperties.has('themeGlowColors') || changedProperties.has('themeParticleColors')) {
      this.updateThemeColors();
    }
    if (changedProperties.has('backdropTextureUrl')) {
      this.updateBackdropTexture();
    }
    if (changedProperties.has('visualizerShape') && this.sphere) {
      this.updateVisualizerGeometry();
    }
  }

  private updateVisualizerGeometry() {
    if (!this.sphere) return;
    
    let geometry;
    let isSphereVal = 0.0;
    switch (this.visualizerShape) {
      case 'cube':
        geometry = new RoundedBoxGeometry(1.2, 1.2, 1.2, 32, 0.2); 
        break;
      case 'pyramid':
        // Use a ConeGeometry for a pyramid shape.
        // 4 radial segments makes it a square pyramid. 32 height segments gives it enough vertices to morph on the sides.
        geometry = new THREE.ConeGeometry(0.9, 1.2, 4, 32);
        // Translate by +0.3 in Y so that rotation happens around the center of mass, preventing off-axis tumbling.
        geometry.translate(0, 0.3, 0);
        break;
      case 'sphere':
      default:
        geometry = new THREE.SphereGeometry(0.8, 128, 128);
        isSphereVal = 1.0;
        break;
    }
    
    if (this.sphere.geometry) {
      this.sphere.geometry.dispose();
    }
    this.sphere.geometry = geometry;
    
    const mat = this.sphere.material as THREE.MeshStandardMaterial;
    if (mat.userData.shader) {
      mat.userData.shader.uniforms.isSphere.value = isSphereVal;
    }
  }

  private updateBackdropTexture() {
    if (!this.backdrop) return;
    if (this.backdropTextureUrl) {
      new THREE.TextureLoader().load(this.backdropTextureUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.backdrop.material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.BackSide,
          depthWrite: false, // Prevent it from occluding things
        });
      });
    } else {
      // Revert to shader material
      this.backdrop.material = new THREE.RawShaderMaterial({
        uniforms: {
          resolution: {value: new THREE.Vector2(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio)},
          rand: {value: 0},
        },
        vertexShader: backdropVS,
        fragmentShader: backdropFS,
        glslVersion: THREE.GLSL3,
        side: THREE.BackSide,
        depthWrite: false,
      });
    }
  }

  private updateThemeColors() {
    if (!this.sphere || !this.particlesData.length) {
      return; // not initialized yet
    }

    const colorSource = this.themeParticleColors && this.themeParticleColors.length > 0 ? this.themeParticleColors : this.themeGlowColors;
    const baseColors = colorSource.map(c => new THREE.Color(c));

    for (let i = 0; i < this.particlesData.length; i++) {
      const pData = this.particlesData[i];
      const newColor = baseColors[i % baseColors.length];
      const newHsl = {h: 0, s: 0, l: 0};
      newColor.getHSL(newHsl);

      // Create variation around the theme's hue
      const hue = newHsl.h + THREE.MathUtils.randFloatSpread(0.1);
      // Ensure saturation and lightness are in a nice range for glowing particles
      const saturation = THREE.MathUtils.clamp(newHsl.s * 1.2, 0.7, 1.0);
      const lightness = THREE.MathUtils.clamp(newHsl.l + 0.1, 0.5, 0.7);
      pData.originalColor.setHSL(hue, saturation, lightness);
    }
  }

  private initParticles() {
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.PARTICLE_COUNT * 3);
    const colors = new Float32Array(this.PARTICLE_COUNT * 3);
    const mobiusTarget = new THREE.Vector3();

    const MOBIUS_RADIUS = 3.5;
    const MOBIUS_WIDTH = 1.5;

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const u = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const v = THREE.MathUtils.randFloat(-MOBIUS_WIDTH / 2, MOBIUS_WIDTH / 2);

      this.particlesData.push({
        velocity: new THREE.Vector3(),
        originalColor: new THREE.Color().setHSL(
          THREE.MathUtils.randFloat(0.5, 0.75),
          0.8,
          0.5,
        ),
        mobiusU: u,
        mobiusV: v,
      });

      // Calculate initial position on the Möbius strip
      const cosU = Math.cos(u);
      const sinU = Math.sin(u);
      const cosHalfU = Math.cos(u / 2);
      const sinHalfU = Math.sin(u / 2);

      mobiusTarget.x = (MOBIUS_RADIUS + v * cosHalfU) * cosU;
      mobiusTarget.y = (MOBIUS_RADIUS + v * cosHalfU) * sinU;
      mobiusTarget.z = v * sinHalfU;

      positions[i * 3] = mobiusTarget.x;
      positions[i * 3 + 1] = mobiusTarget.y;
      positions[i * 3 + 2] = mobiusTarget.z;
    }

    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    );
    this.particleGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3),
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: this.particleSize,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    this.particles = new THREE.Points(this.particleGeometry, particleMaterial);
  }

  private init() {
    const scene = new THREE.Scene();
    this.scene = scene;
    scene.background = new THREE.Color(0x000000);

    // --- Enhanced Lighting Setup for Depth ---
    // Subtle ambient light to ensure nothing is ever pure black.
    const ambientLight = new THREE.AmbientLight(0xffffff, this.ambientLightIntensity);
    this.ambientLight = ambientLight;
    scene.add(ambientLight);

    // Hemisphere light provides soft, colored ambient light from above and below,
    // which gives shadows a natural, soft color and enhances the 3D feel.
    const hemisphereLight = new THREE.HemisphereLight(
      0x606080, // sky color
      0x080820, // ground color
      0.5, // intensity
    );
    scene.add(hemisphereLight);

    // A strong key light to cast sharp, defined shadows.
    const directionalLight = new THREE.DirectionalLight(0xffffff, this.directionalLightIntensity);
    this.directionalLight = directionalLight;
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;

    // Configure shadow camera for quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 25;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;

    scene.add(directionalLight);
    
    // Add a rim light for extra volume and depth but tinted to avoid stark white back edges
    const primaryColorName = this.themeGlowColors[0] || '#00aaff';
    const rimLight = new THREE.DirectionalLight(primaryColorName, 0.15);
    rimLight.position.set(-5, 5, -5);
    scene.add(rimLight);

    this.initParticles();
    scene.add(this.particles);

    const backdrop = new THREE.Mesh(
      new THREE.IcosahedronGeometry(20, 5),
      new THREE.RawShaderMaterial({
        uniforms: {
          resolution: {value: new THREE.Vector2(1, 1)},
          rand: {value: 0},
        },
        vertexShader: backdropVS,
        fragmentShader: backdropFS,
        glslVersion: THREE.GLSL3,
      }),
    );
    backdrop.material.side = THREE.BackSide;
    scene.add(backdrop);
    this.backdrop = backdrop;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 13);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Calculate performance-optimal device pixel ratio (dPR)
    // Avoid heavy supersampling (>2.0) on high resolution displays to ensure high frame rates
    this.dPR = window.innerWidth > 1920 ? 1.0 : Math.min(window.devicePixelRatio, 2.0);
    renderer.setPixelRatio(this.dPR);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

    let geometry;
    switch (this.visualizerShape) {
      case 'cube':
        geometry = new RoundedBoxGeometry(1.2, 1.2, 1.2, 32, 0.2); 
        break;
      case 'pyramid':
        // Use a ConeGeometry for a pyramid shape.
        // 4 radial segments makes it a square pyramid. 32 height segments gives it enough vertices to morph on the sides.
        geometry = new THREE.ConeGeometry(0.9, 1.2, 4, 32);
        // Translate by +0.3 in Y so that rotation happens around the center of mass, preventing off-axis tumbling.
        geometry.translate(0, 0.3, 0);
        break;
      case 'sphere':
      default:
        geometry = new THREE.SphereGeometry(0.8, 128, 128);
        break;
    }

    const createCustomMaterial = (isWireframe: boolean) => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: isWireframe ? 0.8 : 0.1,
        roughness: isWireframe ? 0.2 : 0.7,
        emissive: 0x000000,
        emissiveIntensity: 1.0,
        wireframe: isWireframe,
        transparent: isWireframe,
        opacity: isWireframe ? 0.8 : 1.0,
        blending: isWireframe ? THREE.AdditiveBlending : THREE.NormalBlending,
        side: THREE.DoubleSide,
      });

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.time = {value: 0};
        shader.uniforms.globalTime = {value: 0};
        shader.uniforms.idleStrength = {value: 0.0};
        shader.uniforms.morphingEnabled = {value: this.morphingEnabled ? this.morphingIntensity : 0.0};
        shader.uniforms.isSphere = {value: this.visualizerShape === 'sphere' ? 1.0 : 0.0};
        shader.uniforms.activeEmissiveColor = {
          value: new THREE.Color(0x102040),
        };
        shader.uniforms.inputData = {value: new THREE.Vector4()};
        shader.uniforms.outputData = {value: new THREE.Vector4()};
        mat.userData.shader = shader;
        shader.vertexShader = sphereVS;
        shader.fragmentShader = shader.fragmentShader.replace(
          'void main() {',
          `
            ${fragmentShaderSource}
            void main() {
          `,
        );

        // Boost emissive for wireframe so it looks like an enhancement instead of dull
        const glowBoost = isWireframe ? '2.5' : '1.0';

        shader.fragmentShader = shader.fragmentShader.replace(
          'vec3 totalEmissiveRadiance = emissive;',
          `
            float ao = smoothstep(-0.1, 0.2, vDisplacement);
            ao = mix(0.75, 1.0, ao);
            ao = mix(1.0, ao, morphingEnabled);
            float active_ao = mix(1.0, ao, 1.0 - idleStrength);
            diffuseColor.rgb *= active_ao;
            vec3 viewDir = normalize(vViewPosition);
            float fresnel = dot(vNormal, viewDir);
            fresnel = clamp(fresnel, 0.0, 1.0);
            float volume_factor = pow(fresnel, 0.6);
            vec3 fluid_emissive = cosmic_color(vNormal, time, activeEmissiveColor, vDisplacement);
            vec3 final_emissive = fluid_emissive * volume_factor * active_ao * ${glowBoost};
            vec3 totalEmissiveRadiance = emissive + final_emissive;
          `,
        );
      };
      return mat;
    };

    const sphereMaterial = createCustomMaterial(false);

    const sphere = new THREE.Mesh(geometry, sphereMaterial);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    scene.add(sphere);
    sphere.visible = true;
    this.sphere = sphere;

    const renderPass = new RenderPass(scene, camera);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.bloomIntensity,
      this.bloomRadius,
      this.bloomThreshold,
    );

    this.afterimagePass = new AfterimagePass(this.afterimageStrength);
    this.afterimagePass.enabled = this.afterimageEnabled;

    this.chromaticAberrationPass = new ShaderPass(RGBShiftShader);
    this.chromaticAberrationPass.uniforms['amount'].value =
      this.chromaticAberrationIntensity;
    this.chromaticAberrationPass.enabled = this.chromaticAberrationEnabled;

    this.filmPass = new FilmPass(this.filmGrainIntensity, false);
    this.filmPass.enabled = this.filmGrainEnabled;

    // Use a multisampled render target for maximum anti-aliasing quality in post-processing
    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        samples: renderer.capabilities.maxSamples,
        format: THREE.RGBAFormat,
      }
    );

    const composer = new EffectComposer(renderer, renderTarget);
    composer.addPass(renderPass);
    composer.addPass(this.bloomPass);
    composer.addPass(this.afterimagePass);
    composer.addPass(this.chromaticAberrationPass);
    composer.addPass(this.filmPass);

    this.composer = composer;

    const onWindowResize = () => {
      if (!this.canvas) return;
      const parent = this.parentElement || this;
      const w = parent.clientWidth || window.innerWidth;
      const h = parent.clientHeight || window.innerHeight;
      if (w === 0 || h === 0) return;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      // Dynamically calculate optimal pixel ratio to ensure smooth performance under fullscreen/high-res modes
      this.dPR = w > 1920 ? 1.0 : Math.min(window.devicePixelRatio, 2.0);
      renderer.setPixelRatio(this.dPR);

      const dPR = renderer.getPixelRatio();
      if ((backdrop.material as any).isRawShaderMaterial) {
        (backdrop.material as THREE.RawShaderMaterial).uniforms.resolution.value.set(w * dPR, h * dPR);
      }
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    this.onWindowResizeBound = onWindowResize;

    let resizeTimeout: any = null;
    this.resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) {
        cancelAnimationFrame(resizeTimeout);
      }
      resizeTimeout = requestAnimationFrame(() => {
        onWindowResize();
      });
    });

    const parentEl = this.parentElement || this;
    this.resizeObserver.observe(parentEl);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

    const dispatchCameraUpdate = () => {
      this.dispatchEvent(new CustomEvent('camera-update', {
        detail: {
            rotX: this.targetUserRotX,
            rotY: this.targetUserRotY,
            zoom: this.targetUserZoomMult,
            locked: this.cameraLocked
        }
      }));
    };

    renderer.domElement.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.button === 2) {
        // Right click toggles lock
        this.cameraLocked = !this.cameraLocked;
        if (!this.cameraLocked && !this.isPointerDown) {
          this.targetUserRotX = 0;
          this.targetUserRotY = 0;
        }
        dispatchCameraUpdate();
        return;
      }
      if (e.button !== 0) return; // Only process left click for rotation
      
      this.isPointerDown = true;
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
    });

    renderer.domElement.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;
      e.preventDefault();
      const dx = e.clientX - this.pointerStartX;
      const dy = e.clientY - this.pointerStartY;
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
      
      this.targetUserRotY -= dx * 0.005; // Drag horizontally rotates around Y
      this.targetUserRotX -= dy * 0.005; // Drag vertically rotates around X
      
      // Clamp X rotation to prevent flipping upside down
      this.targetUserRotX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.targetUserRotX));
      
      dispatchCameraUpdate();
    });

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      this.isPointerDown = false;
      if (!this.cameraLocked) {
        this.targetUserRotX = 0;
        this.targetUserRotY = 0;
      }
      dispatchCameraUpdate();
    };

    const onPointerLeave = (e: PointerEvent) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;
      if (!this.cameraLocked) {
        this.targetUserRotX = 0;
        this.targetUserRotY = 0;
      }
      dispatchCameraUpdate();
    };

    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

    renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault(); // Prevent page scroll
      let zoomFactor = 1.0;
      if (e.deltaY > 0) zoomFactor = 1.1;
      else if (e.deltaY < 0) zoomFactor = 0.9;
      
      this.targetUserZoomMult *= zoomFactor;
      this.targetUserZoomMult = Math.max(0.01, Math.min(this.targetUserZoomMult, 10.0)); // Limit zoom
      dispatchCameraUpdate();
    }, { passive: false });

    this.isLoopRunning = true;
    this.animation();
  }

  private updateParticles(
    dt: number,
    totalEnergy: number,
    audioFrequencies: {bass: number; mid: number; treble: number},
  ) {
    const positions = this.particleGeometry.attributes
      .position as THREE.BufferAttribute;
    const colors = this.particleGeometry.attributes
      .color as THREE.BufferAttribute;
    const mobiusTarget = new THREE.Vector3();
    const activeForce = new THREE.Vector3();
    const finalForce = new THREE.Vector3();

    // --- Define parameters for both states ---
    const MOBIUS_RADIUS = 3.5;
    const MOBIUS_WIDTH = 1.5;
    const MOBIUS_SPEED = 0.4 * this.particleSpeed;
    const SEEK_STRENGTH = 0.03; // How strongly particles return to the strip

    // Active state forces are now driven by specific audio frequencies
    // Multipliers are toned down to prevent chaotic movement at high volumes.
    const NOISE_STRENGTH = 0.002 * (1 + audioFrequencies.mid * 9); // Turbulence from mids

    // New parameters to keep particles in an orbital shell around the sphere
    const ACTIVE_ORBIT_RADIUS = 3.0;
    const ORBIT_CORRECTION_STRENGTH = 0.015; // How strongly particles seek the orbit

    const BASS_PULSE_STRENGTH = audioFrequencies.bass * 0.03; // Outward push from bass
    const TREBLE_JITTER_STRENGTH = audioFrequencies.treble * 0.018; // "Sparkle" from treble

    // Drag applied to particles
    const ACTIVE_DRAG = 0.05;
    const IDLE_DRAG = 0.1; // Higher drag for smoother idle flow

    const sphereRadius = 0.8 * this.sphere.scale.x;

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const pData = this.particlesData[i];
      const currentPos = new THREE.Vector3().fromBufferAttribute(positions, i);

      // --- 1. IDLE BEHAVIOR: Calculate target on shape ---
      let cx = 0, cy = 0, cz = 0;
      let R = MOBIUS_RADIUS;
      let targetX = 0, targetY = 0, targetZ = 0;
      
      let uMod = pData.mobiusU % (Math.PI * 4);
      if (uMod < 0) uMod += Math.PI * 4;
      
      const u = pData.mobiusU;
      const v = pData.mobiusV;
      
      switch (this.particleShape) {
        case 'flowerOfLife': {
          const c = FLOWER_OF_LIFE_CENTERS[i % 19];
          cx = c.x * 1.5; cy = c.y * 1.5; cz = 0; R = 1.5;
          targetX = cx + (R + v * 0.2) * Math.cos(u);
          targetY = cy + (R + v * 0.2) * Math.sin(u);
          targetZ = cz + v * 0.8;
          break;
        }
        case 'vesicaPiscis': {
          const c = VESICA_PISCIS_CENTERS[i % 2];
          cx = c.x * 2.0; cy = c.y * 2.0; cz = 0; R = 2.0;
          targetX = cx + (R + v * 0.2) * Math.cos(u);
          targetY = cy + (R + v * 0.2) * Math.sin(u);
          targetZ = cz + v * 0.8;
          break;
        }
        case 'torus': {
          R = 2.5;
          const r_torus = R + 0.8 * Math.cos(3 * u / 2);
          targetX = r_torus * Math.cos(u);
          targetY = r_torus * Math.sin(u);
          targetZ = 1.5 * Math.sin(3 * u / 2) + v;
          break;
        }
        case 'helix': {
          R = 2.0;
          targetX = R * Math.cos(u * 2);
          targetY = (uMod - Math.PI * 2) * 1.5 + v;
          targetZ = R * Math.sin(u * 2);
          break;
        }
        case 'sphere': {
          const sphereIndex = i % 2; // 0 for small, 1 for big
          R = sphereIndex === 0 ? 2.0 : 3.5;
          const phi = sphereIndex === 0 ? -u * 1.5 : u;
          const theta = (v / MOBIUS_WIDTH) * Math.PI + Math.PI / 2;
          targetX = R * Math.sin(theta) * Math.cos(phi);
          targetY = R * Math.cos(theta);
          targetZ = R * Math.sin(theta) * Math.sin(phi);
          break;
        }
        case 'spiral': {
          const r_spiral = 0.8 * uMod;
          targetX = r_spiral * Math.cos(u * 4);
          targetY = r_spiral * Math.sin(u * 4);
          targetZ = v;
          break;
        }
        case 'lissajous': {
          R = 3.0;
          targetX = R * Math.sin(3 * u + Math.PI / 2);
          targetY = R * Math.sin(2 * u);
          targetZ = v;
          break;
        }
        case 'trefoil': {
          targetX = Math.sin(u) + 2 * Math.sin(2 * u);
          targetY = Math.cos(u) - 2 * Math.cos(2 * u);
          targetZ = -Math.sin(3 * u) + v;
          break;
        }
        case 'cinquefoil': {
          const r_cinq = 3 + Math.cos(5 * u / 2);
          targetX = Math.cos(u) * r_cinq;
          targetY = Math.sin(u) * r_cinq;
          targetZ = Math.sin(5 * u / 2) * 2.0 + v;
          break;
        }
        case 'figure8': {
          const r_fig8 = 2 + Math.cos(u);
          targetX = r_fig8 * Math.cos(1.5 * u);
          targetY = 1.5 * Math.sin(2 * u) + v;
          targetZ = r_fig8 * Math.sin(1.5 * u);
          break;
        }
        case 'heart': {
          targetX = 3.0 * Math.pow(Math.sin(u), 3);
          targetY = (13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) * 0.2;
          targetZ = v;
          break;
        }
        case 'butterfly': {
          const r_butt = Math.exp(Math.cos(u)) - 2 * Math.cos(4 * u) + Math.pow(Math.sin(u / 12), 5);
          targetX = r_butt * Math.sin(u) * 1.5;
          targetY = r_butt * Math.cos(u) * 1.5;
          targetZ = v;
          break;
        }
        case 'infinity': {
          const a = 4.0;
          const denom = 1 + Math.pow(Math.sin(u), 2);
          targetX = (a * Math.cos(u)) / denom;
          targetY = (a * Math.sin(u) * Math.cos(u)) / denom;
          targetZ = v;
          break;
        }
        case 'galaxy': {
          const arms = 3;
          const arm = i % arms;
          const angleOffset = (arm * Math.PI * 2) / arms;
          const r_gal = (uMod / (Math.PI * 4)) * 5.0;
          const angle = uMod * 2 + angleOffset;
          targetX = r_gal * Math.cos(angle);
          targetY = r_gal * Math.sin(angle);
          targetZ = v * 0.5 * (5.0 - r_gal);
          break;
        }
        case 'star': {
          R = 3.0;
          const r_star = R * (1 + 0.4 * Math.sin(5 * u));
          targetX = r_star * Math.cos(u);
          targetY = r_star * Math.sin(u);
          targetZ = v;
          break;
        }
        case 'rose': {
          R = 3.5;
          const k = 4;
          const r_rose = R * Math.cos(k * u);
          targetX = r_rose * Math.cos(u);
          targetY = r_rose * Math.sin(u);
          targetZ = v;
          break;
        }
        case 'hypocycloid': {
          const R_hypo = 4.0, r_hypo = 1.0;
          targetX = (R_hypo - r_hypo) * Math.cos(u) + r_hypo * Math.cos((R_hypo - r_hypo) / r_hypo * u);
          targetY = (R_hypo - r_hypo) * Math.sin(u) - r_hypo * Math.sin((R_hypo - r_hypo) / r_hypo * u);
          targetZ = v;
          break;
        }
        case 'triangle': {
          const triangleIndex = i % 2; // 0 for small, 1 for big
          const radius = triangleIndex === 0 ? 1.5 : 3.0;
          
          const sector = Math.floor((uMod / (Math.PI * 2)) * 3) % 3;
          const t = ((uMod / (Math.PI * 2)) * 3) % 1; // 0 to 1
          
          const angles = [
             -Math.PI / 2, 
             -Math.PI / 2 + Math.PI * 2 / 3, 
             -Math.PI / 2 + Math.PI * 4 / 3, 
             -Math.PI / 2 + Math.PI * 2
          ];
          
          const x1 = radius * Math.cos(angles[sector]);
          const y1 = radius * Math.sin(angles[sector]);
          const x2 = radius * Math.cos(angles[sector + 1]);
          const y2 = radius * Math.sin(angles[sector + 1]);
          
          targetX = x1 + (x2 - x1) * t;
          targetY = y1 + (y2 - y1) * t;
          targetZ = v * 0.5;
          break;
        }
        case 'atom': {
          R = 3.0;
          const orbit = i % 3;
          targetX = R * Math.cos(u);
          targetY = R * Math.sin(u);
          targetZ = v;
          // Rotate orbits
          if (orbit === 1) {
            const temp = targetY; targetY = targetX * 0.5 + targetZ * 0.866; targetZ = -targetX * 0.866 + temp * 0.5;
          } else if (orbit === 2) {
            const temp = targetY; targetY = targetX * 0.5 - targetZ * 0.866; targetZ = targetX * 0.866 + temp * 0.5;
          }
          break;
        }
        case 'saturn':
        default: {
          const ringIndex = i % 3; // 0 for inner, 1 for middle, 2 for outer
          // Scale spacing and radius proportionally to visualizerSize so they are beautifully compact and never swallow the rings
          R = this.visualizerSize * (1.25 + ringIndex * 0.35);
          
          const speedMod = ringIndex === 1 ? -1 : 1; 
          const phaseOffset = ringIndex * (Math.PI / 4);
          const adjustedU = u * speedMod + phaseOffset;

          // Scale ring width proportionally with visualizer size so they are not too far apart and don't touch
          const ringWidth = v * 0.12 * (this.visualizerSize / 2.0);
          targetX = (R + ringWidth) * Math.cos(adjustedU);
          targetY = v * 0.08 * (this.visualizerSize / 2.0);
          targetZ = (R + ringWidth) * Math.sin(adjustedU);
          break;
        }
      }

      // Rotate specific 3D shapes to be more recognizable from the default front camera
      if (['saturn', 'cube', 'torus', 'helix', 'triangle', 'figure8'].includes(this.particleShape)) {
         // Apply an isometric-ish rotation so we can see the 3D depth of these shapes
         // Rotate X by 30 degrees
         const rotX = Math.PI / 6;
         const y1 = targetY * Math.cos(rotX) - targetZ * Math.sin(rotX);
         const z1 = targetY * Math.sin(rotX) + targetZ * Math.cos(rotX);
         targetY = y1;
         targetZ = z1;

         // Rotate Y by 45 degrees
         const rotY = Math.PI / 4;
         const x2 = targetX * Math.cos(rotY) + targetZ * Math.sin(rotY);
         const z2 = -targetX * Math.sin(rotY) + targetZ * Math.cos(rotY);
         targetX = x2;
         targetZ = z2;
      }
      
      let trackAngle = 0;
      if (this.particleShape !== 'flowerOfLife' && this.particleShape !== 'vesicaPiscis') {
         // Generic angle progression
         trackAngle = u;
      } else {
         // Custom angle based on center for these specific shapes
         let currentAngle = Math.atan2(currentPos.y - cy, currentPos.x - cx);
         if (currentAngle < 0) currentAngle += Math.PI * 2;
         trackAngle = currentAngle;
      }
      
      let diff = trackAngle - (uMod % (Math.PI*2));
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      const trackStrength = 1.0 - this.idleEffectStrength;
      pData.mobiusU += diff * 0.1 * trackStrength; // Sync angle in active state
      pData.mobiusU += MOBIUS_SPEED * dt * 0.01 * this.idleEffectStrength; // Advance freely in idle state
      
      if (pData.mobiusU > Math.PI * 4) {
        pData.mobiusU -= Math.PI * 4;
      } else if (pData.mobiusU < 0) {
        pData.mobiusU += Math.PI * 4;
      }
      
      mobiusTarget.set(targetX, targetY, targetZ);

      const seekForce = mobiusTarget
        .sub(currentPos)
        .multiplyScalar(SEEK_STRENGTH);

      // --- 2. ACTIVE BEHAVIOR: Calculate orbital and chaotic forces ---
      // This force pushes particles away if they are too close to the center,
      // and pulls them back if they are too far, creating a shell.
      const distFromCenter = currentPos.length() || 1; // Avoid division by zero
      const directionFromCenter = currentPos.clone().normalize();

      const orbitError = distFromCenter - ACTIVE_ORBIT_RADIUS;
      const orbitForce = directionFromCenter.multiplyScalar(
        -orbitError * ORBIT_CORRECTION_STRENGTH,
      );

      const t = this.prevTime * 0.0001;
      const noisePos = currentPos.clone().multiplyScalar(1.2);
      const curlForce = new THREE.Vector3(
        Math.sin(noisePos.z + t),
        Math.cos(noisePos.x + t),
        Math.sin(noisePos.y + t),
      ).multiplyScalar(NOISE_STRENGTH);
      activeForce.copy(orbitForce).add(curlForce);

      // --- 3. BLEND FORCES based on idle state ---
      finalForce.lerpVectors(activeForce, seekForce, this.idleEffectStrength);
      pData.velocity.add(finalForce);

      // --- 4. APPLY FREQUENCY IMPULSES (only in active state) ---
      if (this.idleEffectStrength < 0.9) {
        // Bass Pulse: pushes particles outwards from the center
        if (BASS_PULSE_STRENGTH > 0.001) {
          const directionFromCenter = currentPos.clone().normalize();
          pData.velocity.add(
            directionFromCenter.multiplyScalar(BASS_PULSE_STRENGTH),
          );
        }

        // Treble Jitter: adds sharp, random velocity
        if (TREBLE_JITTER_STRENGTH > 0.001) {
          pData.velocity.add(
            new THREE.Vector3(
              THREE.MathUtils.randFloatSpread(TREBLE_JITTER_STRENGTH),
              THREE.MathUtils.randFloatSpread(TREBLE_JITTER_STRENGTH),
              THREE.MathUtils.randFloatSpread(TREBLE_JITTER_STRENGTH),
            ),
          );
        }
      }

      // --- 5. APPLY DRAG, UPDATE POSITION & HANDLE COLLISIONS ---
      const finalDrag = THREE.MathUtils.lerp(
        ACTIVE_DRAG,
        IDLE_DRAG,
        this.idleEffectStrength,
      );
      pData.velocity.multiplyScalar(1 - finalDrag);
      currentPos.add(pData.velocity);

      // Sphere collision detection and response
      if (this.sphere.visible && sphereRadius > 0) {
        if (currentPos.length() < sphereRadius) {
          const normal = currentPos.clone().normalize();
          currentPos.copy(normal).multiplyScalar(sphereRadius);
          pData.velocity.reflect(normal).multiplyScalar(0.3); // Dampen bounce
        }
      }
      positions.setXYZ(i, currentPos.x, currentPos.y, currentPos.z);

      // --- 6. UPDATE COLOR (driven by treble) ---
      const baseIntensity = THREE.MathUtils.lerp(
        1.0 + totalEnergy * 0.2,
        1.0,
        this.idleEffectStrength,
      );
      // Toned down brightness multiplier for less overwhelming flashes.
      const trebleBrightness = audioFrequencies.treble * 0.4;
      const finalIntensity = baseIntensity + trebleBrightness;

      const finalColor = pData.originalColor
        .clone()
        .multiplyScalar(finalIntensity);
      colors.setXYZ(i, finalColor.r, finalColor.g, finalColor.b);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }

  private animation() {
    if (!this.isLoopRunning || document.hidden) {
      this.isLoopRunning = false;
      return;
    }

    requestAnimationFrame(() => this.animation());

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    const fpsInterval = 1000 / 60; // Max 60 FPS target

    if (elapsed < fpsInterval) {
      return;
    }
    this.lastFrameTime = now - (elapsed % fpsInterval);

    // Update analysers
    if (this.inputAnalyser) this.inputAnalyser.update();
    if (this.outputAnalyser) this.outputAnalyser.update();

    // Check raw sum of PCM output data (from TTS / speaker audio context)
    const rawOutputSum = this.outputAnalyser ? this.outputAnalyser.data.reduce((a, b) => a + b, 0) : 0;
    
    // Determine strict audio source mode: TTS vs Microphone
    // TTS is active if this.isSpeaking is true, there is non-zero output audio, or browser native speech synthesis is speaking
    const isSpeechSynthesizing = window.speechSynthesis && window.speechSynthesis.speaking;
    const isTTSActive = this.isSpeaking || rawOutputSum > 0 || isSpeechSynthesizing;

    if (isTTSActive) {
      // 1. TTS / Speaker mode: suspend microphone analysis completely
      if (this.inputAnalyser) {
        this.inputAnalyser.data.fill(0);
      }
      // If native SpeechSynthesis is fallback-speaking with zero Web Audio output, generate a subtle smooth envelope
      if (rawOutputSum === 0 && isSpeechSynthesizing) {
        const timeMs = performance.now();
        const envelope = 0.5 + 0.3 * Math.sin(timeMs * 0.012);
        for (let i = 0; i < this.outputAnalyser.data.length; i++) {
          const val = Math.floor((0.3 + 0.5 * Math.abs(Math.sin(timeMs * 0.03 + i * 0.5))) * envelope * 200);
          this.outputAnalyser.data[i] = val;
        }
      }
    } else {
      // 2. Microphone / Input mode: suspend TTS analysis
      if (this.outputAnalyser) {
        this.outputAnalyser.data.fill(0);
      }
    }

    // If the system is deactivated, completely zero out all audio data
    if (!this.isActive) {
      if (this.inputAnalyser) this.inputAnalyser.data.fill(0);
      if (this.outputAnalyser) this.outputAnalyser.data.fill(0);
    }

    // Calculate time delta
    const t = performance.now();
    const dt = Math.min(3, (t - this.prevTime) / (1000 / 60)); // Clamp dt
    this.prevTime = t;
    this.visualizerTime += dt * 16.666 * this.visualizerSpeed;

    // Calculate audio metrics based on the active channel
    const inputSum = this.inputAnalyser ? this.inputAnalyser.data.reduce((a, b) => a + b, 0) : 0;
    const outputSum = this.outputAnalyser ? this.outputAnalyser.data.reduce((a, b) => a + b, 0) : 0;
    
    const activeSum = isTTSActive ? outputSum : inputSum;
    const activeLength = isTTSActive 
      ? (this.outputAnalyser ? this.outputAnalyser.data.length : 32)
      : (this.inputAnalyser ? this.inputAnalyser.data.length : 32);
    
    const totalEnergy = activeSum / (activeLength * 255);

    if (this.isActive) {
      if (totalEnergy > 0.005 || isTTSActive) {
        this.lastSoundTime = t;
      } else if (t - this.lastSoundTime > 30000) {
        this.dispatchEvent(new CustomEvent('silence-timeout'));
        this.lastSoundTime = t; // Reset so it doesn't spam
      }
    } else {
      this.lastSoundTime = t;
    }

    // Get detailed frequency data for active source
    const inputBass = this.inputAnalyser ? (this.inputAnalyser.data[0] + this.inputAnalyser.data[1]) / 2 / 255 : 0;
    const inputMid = this.inputAnalyser ? (this.inputAnalyser.data[5] + this.inputAnalyser.data[6]) / 2 / 255 : 0;
    const inputTreble = this.inputAnalyser ? (this.inputAnalyser.data[10] + this.inputAnalyser.data[11]) / 2 / 255 : 0;

    const outputBass = this.outputAnalyser ? (this.outputAnalyser.data[0] + this.outputAnalyser.data[1]) / 2 / 255 : 0;
    const outputMid = this.outputAnalyser ? (this.outputAnalyser.data[5] + this.outputAnalyser.data[6]) / 2 / 255 : 0;
    const outputTreble = this.outputAnalyser ? (this.outputAnalyser.data[10] + this.outputAnalyser.data[11]) / 2 / 255 : 0;

    // Strict single active source for particle and visualizer calculations
    const bass = isTTSActive ? outputBass : inputBass;
    const mid = isTTSActive ? outputMid : inputMid;
    const treble = isTTSActive ? outputTreble : inputTreble;

    // Update particles based on active audio energy and frequencies
    this.updateParticles(dt, totalEnergy, {bass, mid, treble});

    // Update scene objects
    if ((this.backdrop.material as any).isRawShaderMaterial) {
      const backdropMaterial = this.backdrop.material as THREE.RawShaderMaterial;
      backdropMaterial.uniforms.rand.value = Math.random() * 10000;
      backdropMaterial.uniforms.resolution.value.set(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio);
    }
    const sphereMaterial = this.sphere.material as THREE.MeshStandardMaterial;

    if (sphereMaterial.userData.shader) {
      // Smoothly transition between idle and active states using active channel energy
      const maxEnergyNorm = totalEnergy;
      
      const fastEnergy = THREE.MathUtils.lerp(
        this.smoothedEnergy,
        maxEnergyNorm,
        maxEnergyNorm > this.smoothedEnergy ? 0.4 : 0.05
      );
      this.smoothedEnergy = fastEnergy;

      // Smooth target idle strength based directly on actual audio amplitude.
      // While TTS audio is actively playing (auto-play or Speak Aloud button), completely disable the idle state
      // (targetIdleStrength = 0.0) so the visualizer stays fully active for the entire duration of playback
      // with zero intermediate drops to idle during speech pauses.
      const targetIdleStrength = !this.isActive
        ? 1.0
        : isTTSActive
          ? 0.0
          : 1.0 - THREE.MathUtils.clamp((fastEnergy - 0.01) / 0.2, 0.0, 1.0);
      
      // Gradually resume when microphone is disabled or audio goes silent.
      const lerpFactor = targetIdleStrength > this.idleEffectStrength 
        ? 0.015 // Very slow recovery to idle (gradually resumes)
        : 0.08; // Faster response when becoming active
      
      this.idleEffectStrength = THREE.MathUtils.lerp(
        this.idleEffectStrength,
        targetIdleStrength,
        lerpFactor,
      );

      // Dynamically control post-processing and emissive intensity.
      // Keep the intensities identical so the fluid effect remains prominent
      // and the brightness does not increase during the active state.
      // Calculate pulse based on time
      const pulseFactor = Math.abs(Math.sin(t * 0.005));
      const activeBloomIntensity = this.bloomIntensity * 1.5 * (1 + pulseFactor * this.glowPulseStrength);
      const idleBloomIntensity = this.bloomIntensity * 1.5 * (1 + pulseFactor * this.glowPulseStrength);
      const idleEmissiveIntensity = 2.0;
      const activeEmissiveIntensity = 2.0;

      this.bloomPass.intensity = THREE.MathUtils.lerp(
        activeBloomIntensity,
        idleBloomIntensity,
        this.idleEffectStrength,
      );
      sphereMaterial.emissiveIntensity = THREE.MathUtils.lerp(
        activeEmissiveIntensity,
        idleEmissiveIntensity,
        this.idleEffectStrength,
      );

      // Update shader uniforms
      const shaderUniforms = sphereMaterial.userData.shader.uniforms;
      shaderUniforms.idleStrength.value = this.idleEffectStrength;
      shaderUniforms.globalTime.value = this.visualizerTime * 0.0002;

      const targetPulse = Math.max(
        this.outputAnalyser ? this.outputAnalyser.data[1] : 0,
        this.inputAnalyser ? this.inputAnalyser.data[1] : 0
      );

      this.smoothedPulseBase = THREE.MathUtils.lerp(
        this.smoothedPulseBase,
        targetPulse,
        targetPulse > this.smoothedPulseBase ? 0.2 : 0.08
      );

      const scalePulse = this.morphingEnabled ? (0.1 * this.smoothedPulseBase * this.morphingIntensity) / 255 : 0;
      this.sphere.scale.setScalar(
        this.visualizerSize * (1 + scalePulse),
      );

      // Rotate the entire mesh if it's not a sphere (since shader wobble is disabled for non-spheres)
      if (this.visualizerShape !== 'sphere') {
        const floatTime = this.visualizerTime * 0.001;
        // The rotation is stronger when idle
        const baseRotSpeed = 0.5 * parseFloat(this.rotationSpeed.toString());
        const idleRotSpeed = baseRotSpeed + this.idleEffectStrength * 1.5;
        
        // Use dt-based accumulation for continuous rotation to prevent large jumps when idleRotSpeed changes
        const timeDeltaSeconds = dt * 16.666 * 0.001 * this.visualizerSpeed;
        this.visualizerRotationY += timeDeltaSeconds * idleRotSpeed;
        
        let tiltAmpX = idleRotSpeed;
        let tiltAmpZ = idleRotSpeed * 0.5;
        
        if (this.visualizerShape === 'pyramid') {
          // Keep the pyramid mostly upright so the tip doesn't point at the user
          tiltAmpX = Math.min(idleRotSpeed, 0.3);
          tiltAmpZ = Math.min(idleRotSpeed * 0.5, 0.3);
        }
        
        this.sphere.rotation.x = Math.sin(floatTime * 0.3) * tiltAmpX;
        this.sphere.rotation.y = this.visualizerRotationY;
        this.sphere.rotation.z = Math.cos(floatTime * 0.4) * tiltAmpZ;
      } else {
        this.sphere.rotation.set(0, 0, 0); // Reset for sphere which uses shader wobble
      }


      // Get base HSL from theme colors shifting over time
      const colorCount = this.themeGlowColors.length;
      const cycleTime = 2000 / Math.max(0.1, this.themeTransitionSpeed); // base 2000ms per color
      const colorProgress = (t % (cycleTime * colorCount)) / cycleTime;
      const colorIndex1 = Math.floor(colorProgress) % colorCount;
      const colorIndex2 = (colorIndex1 + 1) % colorCount;
      const colorMix = colorProgress % 1.0;

      const c1 = new THREE.Color(this.themeGlowColors[colorIndex1]);
      const c2 = new THREE.Color(this.themeGlowColors[colorIndex2]);
      const themeColor = new THREE.Color().copy(c1).lerp(c2, colorMix);

      const themeHsl = {h: 0, s: 0, l: 0};
      themeColor.getHSL(themeHsl);

      // Set the active color based on audio output
      const colorIntensity =
        (this.outputAnalyser.data[2] + this.outputAnalyser.data[3]) / 2 / 255;
      
      // Use the exact theme color to prevent any color drift.
      // We only add a microscopic lightness pulse based on audio to keep it alive,
      // without fundamentally changing the color balance.
      const activeColor = themeColor.clone();
      if (colorIntensity > 0.01) {
        activeColor.offsetHSL(0, 0, colorIntensity * 0.02);
      }

      // Update both the material's main color (for lighting) and the
      // shader's emissive uniform (for the glow).
      sphereMaterial.color.copy(activeColor);
      shaderUniforms.activeEmissiveColor.value.copy(activeColor);

      // Smoothed Camera Rotation
      // Always spin a minimum amount, and spin way more when there's audio energy
      const f = (0.005 + (maxEnergyNorm * 0.02)) * this.rotationSpeed;
      
      const combinedData1 = Math.max(this.inputAnalyser.data[1], this.outputAnalyser.data[1]);
      const combinedData2 = Math.max(this.inputAnalyser.data[2], this.outputAnalyser.data[2]);
      
      // Add a base continuous drift to the camera rotation so it never stays strictly in one place
      const baseDrift = this.autoPanEnabled ? (dt * 0.002 * this.autoPanSpeed) : 0;
      
      let targetRotationX =
        this.rotation.x + baseDrift + (dt * f * 0.5 * combinedData1) / 255;
      let targetRotationY =
        this.rotation.y + baseDrift + (dt * f * 1.5 * combinedData2) / 255;
      let targetRotationZ =
        this.rotation.z + baseDrift + (dt * f * 0.5 * combinedData1) / 255;

      if (this.rotationLocked) {
        this.rotation.x = THREE.MathUtils.lerp(this.rotation.x, 0, 0.1);
        this.rotation.y = THREE.MathUtils.lerp(this.rotation.y, 0, 0.1);
        this.rotation.z = THREE.MathUtils.lerp(this.rotation.z, 0, 0.1);
      } else {
        this.rotation.x = THREE.MathUtils.lerp(
          this.rotation.x,
          targetRotationX,
          0.1,
        );
        this.rotation.y = THREE.MathUtils.lerp(
          this.rotation.y,
          targetRotationY,
          0.1,
        );
        this.rotation.z = THREE.MathUtils.lerp(
          this.rotation.z,
          targetRotationZ,
          0.1,
        );
      }

      this.userRotX = THREE.MathUtils.lerp(this.userRotX, this.targetUserRotX, 0.1);
      this.userRotY = THREE.MathUtils.lerp(this.userRotY, this.targetUserRotY, 0.1);
      this.userZoomMult = THREE.MathUtils.lerp(this.userZoomMult, this.targetUserZoomMult, 0.2);

      // Dynamic Camera Distance (Zoom) to frame the visualizer
      // Ensure we don't zoom in so close that we clip inside the shape
      let minSafeDist = this.visualizerSize * 2.2;
      if (this.particleShape === 'mobius') minSafeDist = 4.5 * this.visualizerSize;
      else if (this.particleShape === 'saturn') minSafeDist = 3.5 * this.visualizerSize;
      else if (this.visualizerShape === 'cube') minSafeDist = this.visualizerSize * 2.8;

      const rawTargetDist = ((13 + totalEnergy * 2) / this.globalScale) * this.userZoomMult;
      const targetDist = Math.max(minSafeDist, rawTargetDist);
      
      const currentDist = this.camera.position.length();
      const newDist = THREE.MathUtils.lerp(currentDist, targetDist, 0.1);

      const euler = new THREE.Euler(
        this.rotation.x + this.userRotX,
        this.rotation.y + this.userRotY,
        this.rotation.z,
        "YXZ"
      );
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      const vector = new THREE.Vector3(0, 0, newDist);
      vector.applyQuaternion(quaternion);
      this.camera.position.copy(vector);
      this.camera.lookAt(this.sphere.position);

      // Ensure the shader time flows correctly for both audio sources.
      // E.g. screen share uses the inputNode (so its data goes to inputAnalyser)
      const maxData0 = Math.max(this.outputAnalyser.data[0], this.inputAnalyser.data[0]);
      
      shaderUniforms.time.value +=
        ((dt * 0.1 * maxData0) / 255 + (dt * 0.005)) * this.visualizerSpeed;

      // Smooth the frequency data for the shader to prevent abrupt snapping when audio stops
      const dataLerpFactor = 0.02;
      this.smoothedInputData.x = THREE.MathUtils.lerp(this.smoothedInputData.x, inputBass, inputBass > this.smoothedInputData.x ? 0.2 : dataLerpFactor);
      this.smoothedInputData.y = THREE.MathUtils.lerp(this.smoothedInputData.y, inputMid, inputMid > this.smoothedInputData.y ? 0.2 : dataLerpFactor);
      this.smoothedInputData.z = THREE.MathUtils.lerp(this.smoothedInputData.z, inputTreble, inputTreble > this.smoothedInputData.z ? 0.2 : dataLerpFactor);
      
      this.smoothedOutputData.x = THREE.MathUtils.lerp(this.smoothedOutputData.x, outputBass, outputBass > this.smoothedOutputData.x ? 0.2 : dataLerpFactor);
      this.smoothedOutputData.y = THREE.MathUtils.lerp(this.smoothedOutputData.y, outputMid, outputMid > this.smoothedOutputData.y ? 0.2 : dataLerpFactor);
      this.smoothedOutputData.z = THREE.MathUtils.lerp(this.smoothedOutputData.z, outputTreble, outputTreble > this.smoothedOutputData.z ? 0.2 : dataLerpFactor);

      // Send detailed frequency data to sphere displacement shader
      shaderUniforms.inputData.value.set(this.smoothedInputData.x, this.smoothedInputData.y, this.smoothedInputData.z, 0);
      shaderUniforms.outputData.value.set(
        this.smoothedOutputData.x,
        this.smoothedOutputData.y,
        this.smoothedOutputData.z,
        0,
      );
    }

    this.composer.render();
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.isLoopRunning = false;
    } else {
      if (!this.isLoopRunning) {
        this.isLoopRunning = true;
        this.prevTime = performance.now();
        this.lastFrameTime = performance.now();
        this.animation();
      }
    }
  };

  protected firstUpdated() {
    // Fix: Use `this.renderRoot` which is the Lit-recommended way to access the component's root node.
    // Cast to `any` because of a project-level type resolution issue.
    this.canvas = (this as any).renderRoot.querySelector('canvas') as HTMLCanvasElement;
    this.init();
    this.updateThemeColors();
  }

  private cleanupThreeResources() {
    this.isLoopRunning = false;

    // Disconnect Analysers
    if (this.inputAnalyser && this._inputNode) {
      try {
        this.inputAnalyser.disconnect(this._inputNode);
      } catch (e) {}
    }
    if (this.outputAnalyser && this._outputNode) {
      try {
        this.outputAnalyser.disconnect(this._outputNode);
      } catch (e) {}
    }

    if (this.onWindowResizeBound) {
      window.removeEventListener('resize', this.onWindowResizeBound);
      this.onWindowResizeBound = undefined;
    }

    if (this.scene) {
      this.scene.traverse((object: any) => {
        if (object.isMesh || object.isPoints) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
    }

    // Dispose postprocessing passes and composer
    if (this.bloomPass) {
      try { (this.bloomPass as any).dispose(); } catch (e) {}
    }
    if (this.afterimagePass) {
      try { (this.afterimagePass as any).dispose(); } catch (e) {}
    }
    if (this.chromaticAberrationPass) {
      try { (this.chromaticAberrationPass as any).dispose(); } catch (e) {}
    }
    if (this.filmPass) {
      try { (this.filmPass as any).dispose(); } catch (e) {}
    }
    if (this.composer) {
      try { this.composer.dispose(); } catch (e) {}
    }

    if (this.renderer) {
      try {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
      } catch (e) {}
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.cleanupThreeResources();
  }

  protected render() {
    return html`<canvas></canvas>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gdm-live-audio-visuals-3d': GdmLiveAudioVisuals3D;
  }
}
