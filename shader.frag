#version 330 core

//CONSTANTS
const float MAX_DIST = 25.0;
const float MIN_DIST = 0.0035;
const float pi = 3.141592653589793;

//structs
float g_viewDist = 0.0;
struct Point {
  float dist;
  vec4 color;
  int shapeId;
};

// Uniforms from Shadertoy-like environment
uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;

// Fragment output
out vec4 FragColor;

//random

vec2 rot2D(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// noise generation //taken from https://www.shadertoy.com/view/Msf3WH
/* discontinuous pseudorandom uniformly distributed in [-0.5, +0.5]^3 */
vec3 random3(vec3 c) {
  float j = 4096.0 * sin(dot(c, vec3(17.0, 59.4, 15.0)));
  vec3 r;
  r.z = fract(512.0 * j);
  j *= .125;
  r.x = fract(512.0 * j);
  j *= .125;
  r.y = fract(512.0 * j);
  return r - 0.5;
}

/* skew constants for 3d simplex functions */
const float F3 = 0.3333333;
const float G3 = 0.1666667;

/* 3d simplex noise */
float simplex3d(vec3 p) {
  /* 1. find current tetrahedron T and it's four vertices */
  
  vec3 s = floor(p + dot(p, vec3(F3)));
  vec3 x = p - s + dot(s, vec3(G3));

  /* calculate i1 and i2 */
  vec3 e = step(vec3(0.0), x - x.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);

  /* x1, x2, x3 */
  vec3 x1 = x - i1 + G3;
  vec3 x2 = x - i2 + 2.0 * G3;
  vec3 x3 = x - 1.0 + 3.0 * G3;

  /* 2. find four surflets and store them in d */
  vec4 w, d;

  /* calculate surflet weights */
  w.x = dot(x, x);
  w.y = dot(x1, x1);
  w.z = dot(x2, x2);
  w.w = dot(x3, x3);

  /* w fades from 0.6 at the center of the surflet to 0.0 at the margin */
  w = max(0.6 - w, 0.0);

  /* calculate surflet components */
  d.x = dot(random3(s), x);
  d.y = dot(random3(s + i1), x1);
  d.z = dot(random3(s + i2), x2);
  d.w = dot(random3(s + 1.0), x3);

  /* multiply d by w^4 */
  w *= w;
  w *= w;
  d *= w;

  /* 3. return the sum of the four surflets */
  return dot(d, vec4(52.0));
}

/* const matrices for 3d rotation */
const mat3 rot1 = mat3(-0.37, 0.36, 0.85, -0.14, -0.93, 0.34, 0.92, 0.01, 0.4);
const mat3 rot2 = mat3(-0.55, -0.39, 0.74, 0.33, -0.91, -0.24, 0.77, 0.12, 0.63);
const mat3 rot3 = mat3(-0.71, 0.52, -0.47, -0.08, -0.72, -0.68, -0.7, -0.45, 0.56);

/* directional artifacts can be reduced by rotating each octave */
float simplex3d_fractal(vec3 m) {
  return 0.53 * simplex3d(m * rot1) +
    0.27 * simplex3d(2.0 * m * rot2) +
    0.13 * simplex3d(4.0 * m * rot3) +
    0.067 * simplex3d(8.0 * m);
}

//shapes

vec3 colorMap[4] = vec3[4](
  vec3(0.000, 0.000, 0.600),
  vec3(1.000, 1.000, 0.000),
  vec3(0.000, 0.300, 0.000),
  vec3(0.700, 0.600, 0.900)
);

vec4 getPlanetColor(vec3 n, float noise) {
  float t = clamp(noise * 10.0, 0.0, 1.0);
  vec3 c0 = colorMap[0];
  c0.b -= simplex3d_fractal((n + vec3(0., cos(iTime * 0.1), sin(iTime * 0.1))) * 3.5);

  vec3 c = mix(c0, colorMap[1], smoothstep(0.0, 0.23, t));
  c = mix(c, colorMap[2], smoothstep(0.14, 0.26, t));
  c = mix(c, colorMap[3], smoothstep(0.66, 1.0, t));

  return vec4(c, 1.0);
}


Point planet(vec3 p, vec3 center, float radius, vec4 color, vec3 rotation, vec3 pivot, int currentId) {

  p -= center;
  float lenP = length(p);

  if (lenP > radius + 1.44) {
    return Point(lenP - radius, color, currentId);
  }

  p.yz = rot2D(p.yz, rotation.x);
  p.xz = rot2D(p.xz, rotation.y);
  p.xy = rot2D(p.xy, rotation.z);

  p += pivot; 
  lenP = length(p);

  vec3 n = normalize(p);

  float noise = 0.0;

  if (g_viewDist > 12.) {
    noise = simplex3d(n * 1.5) * 0.3;
    noise *= noise;
  } else {
    noise = simplex3d(n * 1.5) * 0.3;
    noise *= noise;
    noise += simplex3d_fractal(n) * 0.2;
    noise += simplex3d_fractal(n * 6.) * 0.04;
  }
  
  color = getPlanetColor(n, noise);

  float displacement = noise + 1.;
  float base = lenP - radius * displacement;
  float dist = base;

  Point res = Point(dist, color, currentId);

  return res;
}

Point cloudSphere(vec3 p, vec3 center, float radius, vec4 color, vec3 rotation, vec3 pivot, int currentId) {

  p -= center;
  float lenP = length(p);

  if (lenP > radius + 1.44) {
    return Point(lenP - radius, color, currentId);
  }

  p.yz = rot2D(p.yz, rotation.x);
  p.xz = rot2D(p.xz, rotation.y);
  p.xy = rot2D(p.xy, rotation.z);

  p += pivot; 

  lenP = length(p);
  vec3 n = normalize(p);

  float noise = 0.;

  if (g_viewDist > 12.) {

  } else {
    noise = simplex3d_fractal(n * 4.5 + iTime * 0.1) * 0.5;
  }

  color = vec4(1., 1., 1., noise * 2.5 + 0.5);

  float displacement = (noise * 0.12);
  float base = lenP - radius * (displacement + 1.);
  float oppbase = lenP - radius * (1. - displacement);
  float dist = max(base, -oppbase);

  Point res = Point(dist, color, currentId);

  return res;
}

Point moon(vec3 p, vec3 center, float radius, vec4 color, vec3 rotation, vec3 pivot, int currentId) {

  p -= center;
  float lenP = length(p);

  if (lenP > radius + 1.44) {
    return Point(lenP - radius, color, currentId);
  }

  p.yz = rot2D(p.yz, rotation.x);
  p.xz = rot2D(p.xz, rotation.y);
  p.xy = rot2D(p.xy, rotation.z);

  p += pivot; 
  lenP = length(p);
  vec3 n = normalize(p);
  float noise = 0.0;
  if (g_viewDist > 12.) {
    noise = simplex3d(n * 1.5) * 0.3;
    noise *= noise;
  } else {
    noise = simplex3d(n * 1.5) * 0.2;
    noise *= noise;
    noise += simplex3d_fractal(n * 2.5) * 0.1;
  }

  float displacement = noise + 1.;
  float base = lenP - radius * displacement;
  float dist = base;

  Point res = Point(dist, color, currentId);

  return res;
}

Point sdfSphere(vec3 p, vec3 center, float radius, vec4 color, vec3 rotation, vec3 pivot, int currentId) {

  p = p - center; 

  // Matrix construction and vector transformation
  mat2 rotX = mat2(cos(rotation.x), -sin(rotation.x),
    sin(rotation.x), cos(rotation.x));
  vec2 yz = rotX * p.yz;
  p.y = yz.x;
  p.z = yz.y;

  mat2 rotY = mat2(cos(rotation.y), sin(rotation.y),
    -sin(rotation.y), cos(rotation.y));
  vec2 xz = rotY * p.xz;
  p.x = xz.x;
  p.z = xz.y;

  mat2 rotZ = mat2(cos(rotation.z), -sin(rotation.z),
    sin(rotation.z), cos(rotation.z));
  vec2 xy = rotZ * p.xy;
  p.x = xy.x;
  p.y = xy.y;

  p += pivot; 

  Point res = Point(length(p) - radius, color, currentId);

  return res;
}

//functions

Point sdfUnion(Point d1, Point d2) {
  if (d1.dist <= d2.dist) return d1;
  return d2;
}

const float tilt = 0.5;
const float r = 4.4;
const mat2 rotX = mat2(
  cos(tilt), -sin(tilt),
  sin(tilt), cos(tilt)
);

Point map(vec3 p, int jumpShape, bool skipTrasparent) {
  int shapeIndex = 1;

  Point obj;

  Point m = planet(p,
    vec3(0.0, 0.0, 0.0),
    2.4,
    vec4(1.000, 1.000, 1.000, 1.0),
    vec3(0.12, iTime * 0.25, 0.), 
    vec3(0., 0., 0.), 

    shapeIndex
  );

  shapeIndex++;
  //stars
  if (distance(p, vec3(0.0)) >= 14.) {

    vec3 repeted = mod(p, 2.0) - 1.0;

    obj = sdfSphere(repeted,
      vec3(0.0, 0.0, 0.0),
      0.02,
      vec4(2.000, 2.000, 2.000, 1.0),
      vec3(0., 0., 0.), 
      vec3(0., 0., 0.), 

      shapeIndex
    );

    shapeIndex = obj.shapeId;

    m = sdfUnion(obj, m);
  }

  float a = iTime * 0.2;

  vec3 moon1Pos = vec3(cos(a + 0.0) * r, 0.0, sin(a + 0.0) * r);

  moon1Pos.yz = rotX * moon1Pos.yz;

  obj = moon(p,
    moon1Pos,
    0.4,
    vec4(1.000, 1.000, 1.000, 1.0),
    vec3(0., -a, 0.), 
    vec3(0., 0., 0.), 

    shapeIndex
  );

  m = sdfUnion(obj, m);
  shapeIndex++;

  //Clouds 
  if (shapeIndex != jumpShape && !skipTrasparent) {
    obj = cloudSphere(p,
      vec3(0.0, 0.0, 0.0),
      2.6,
      vec4(1.000, 1.000, 1.000, 0.5),
      vec3(0.32, iTime * 0.2, 0.), 
      vec3(0., 0., 0.), 

      shapeIndex
    );

    m = sdfUnion(obj, m);
  }

  return m;
}

vec3 getNormal(vec3 p) {
  float d = map(p, -1, false).dist;
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    map(p + e.xyy, -1, false).dist - d,
    map(p + e.yxy, -1, false).dist - d,
    map(p + e.yyx, -1, false).dist - d
  ));
}

Point rayMarch(vec3 ro, vec3 rd, float maxDist) {

  int jShapes = -1;

  Point p = map(ro, jShapes, false);
  float dist = p.dist;
  Point oldP = Point(MAX_DIST, vec4(0.000, 0.0, 0.05, 0.1), -1);

  int i = 0;

  while (dist < maxDist && i < 30) {
    i++;
    g_viewDist = dist;
    p = map(ro + rd * dist, jShapes, false);
    if (p.dist <= MIN_DIST) {
      if (p.color.w >= 1.0) {
        if (oldP.shapeId < 0) {
          oldP.dist = dist;
          oldP.color = p.color;
          oldP.shapeId = p.shapeId;
        } else {
          oldP.color = mix(p.color, oldP.color, oldP.color.w);
        }
        break;
      } else {
        p.color = mix(oldP.color, p.color, p.color.w);
        oldP.color = p.color;
        if (oldP.dist >= MAX_DIST) {
          oldP.dist = dist;
          oldP.shapeId = p.shapeId;
        }
        jShapes = p.shapeId;
      }
    }
    dist += p.dist;
  }
  return oldP;
}

Point rayMarchShadow(vec3 ro, vec3 rd, float maxDist, int currentShapeId) {
  float shadow = 1.0;
  float t = 0.1;

  for (int i = 0; i < 30 && t < maxDist; i++) {
    Point h = map(ro + rd * t, currentShapeId, true);

    if (h.dist < MIN_DIST)
      return Point(0.0, h.color, h.shapeId);

    float contribution = h.dist / t;

    shadow = min(shadow, contribution);

    t += h.dist;
  }

  shadow = clamp(shadow, 0.0, 1.0);

  return Point(shadow, vec4(1.0), -1);
}

void camera(vec2 uv, out vec3 ro, out vec3 rd) {
  vec3 ta = vec3(0.0, 0.0, 0.0);
  vec2 m = iMouse.xy / iResolution.xy;

  if (iMouse.z <= 0.0) {
    m = vec2(0.5, 0.5);
  }

  float hd = -m.x * 14.0 + pi;
  float elv = m.y * pi * 0.4 - pi * 0.25;
  
  ro = vec3(sin(hd) * cos(elv), sin(elv), cos(hd) * cos(elv));
  ro = ro * 8.0 + vec3(0.0, 6.0, 0.0);

  vec3 cw = normalize(ta - ro);
  vec3 cp = vec3(0.0, 1.0, 0.0);

  vec3 cu = normalize(cross(cw, cp));
  vec3 cv = normalize(cross(cu, cw));
  
  rd = normalize(uv.x * cu + uv.y * cv + 2.5 * cw);
}

vec3 render(vec2 uv) {
  vec3 ro;
  vec3 rd;
  vec3 color;

  camera(uv, ro, rd);

  Point p = rayMarch(ro, rd, MAX_DIST);

  if (p.dist < MAX_DIST ) {
    vec3 pos = ro + rd * (p.dist); 
    vec4 baseColor = p.color;
    vec3 normal = getNormal(pos);

    //lighting
    vec3 ambient = vec3(1.000, 1.000, 1.000);
    vec3 lightColor = vec3(1.000, 1.000, 0.900);
    vec3 lightSource = vec3(7., 3.7, 7.);
    
    vec3 lightDir = normalize(lightSource - pos);

    float diffuseStrength = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = lightColor * diffuseStrength;

    //specular
    lightColor = vec3(1.000, 1.000, 1.000);
   
    vec3 viewDir  = normalize(ro - pos);
    vec3 halfwayDir = normalize(lightDir + viewDir);
    
    float specularStrength = pow(max(dot(normal, halfwayDir), 0.0), 64.0);
    vec3 specular = specularStrength * lightColor;

    vec3 lighting = ambient * 0.3 + (diffuse + (1. - p.color.w)) * 0.90 + specular * 0.2;
    color = baseColor.rgb * lighting;

    //shadows
    float distToLightSource = length(lightSource - pos);

    ro = pos + normal * 0.3;
    rd = lightDir;
    Point pointShadow = rayMarchShadow(ro, rd, distToLightSource, p.shapeId);

    color = mix(pointShadow.color.rgb * pointShadow.color[3], color * pointShadow.dist, pointShadow.color[3]).rgb;

    // Gamma correction
    color = pow(color, vec3(1.0 / 2.2));

  } else {
    color = p.color.rgb;
  }

  return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  float aspectRatio = iResolution.x / iResolution.y;

  vec2 uv = 2.0 * fragCoord / iResolution.xy - 1.0;

  uv.x *= aspectRatio;

  vec3 color = vec3(0.0);
  color = render(uv);
  fragColor = vec4(color, 1.0);
}

void main() {
    vec4 color;
    mainImage(color, gl_FragCoord.xy);
    FragColor = color;
}
