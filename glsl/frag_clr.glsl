/**
 * This file is a part of Writing on Water application.
 *
 * Copyright (c) 2012 Antonio R. <antonio@rain-d.ru>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

//#version 130

uniform sampler2D mask;         // Stroke mask.
uniform sampler2D background;   // Background image.
//uniform sampler2D perm;         // Permutation map for noise.
uniform sampler2D papernorm;    // Normal map of paper texture.
uniform sampler2D colormap;     // Particles color map.
uniform sampler2D mapweights;   // Colormap weights.
uniform vec2 txadd;
uniform vec2 txmul;
uniform vec2 txadd1;
uniform vec2 txmul1;
uniform vec2 txstep;
uniform vec4 renderpar0;        // {opacity, edgepower, bumppower, noise}
uniform vec2 noiseoffset;       // Offset in the noise texture (to make it unique for each stroke).
uniform vec3 lightdir;          // Light source direction.
uniform vec4 bordersz;          // Masked border size.
uniform vec4 borderclr;         // Masked border color.

varying vec2 tx1;               // Texture coordinates.
varying vec4 fragpos;


const vec4 WHITE = vec4 (1.0, 1.0, 1.0, 1.0);

float snoise2 (vec2 P);

float sigmoid (float x) {
    float x1 = x - 0.5;
    return 0.5 + (x1 / sqrt (1.0 + x1 * x1));
}

void main () {
  // Weird texcoords transformation.
  // FIXME Arrghh... when shall I get rid of these hacks?
  vec2 tx1i = txmul1 * tx1 + txadd1;
  vec2 tx2 = fragpos.xy * vec2 (1.0, -1.0) * txmul + txadd + vec2 (0.5, 0.5);
  // Transform the coords into aspect=1:1 for paper.
  vec2 tx3 = tx2 * max (txmul.x, txmul.y) / txmul.xy;
  // Noise coords.
  vec2 tx4 = mix (tx2, noiseoffset, 0.2);

  vec4 w       = texture2D (mask, tx2);
  vec4 w0      = texture2D (mask, tx2 + txstep * vec2 (-1.5, +0));
  vec4 w1      = texture2D (mask, tx2 + txstep * vec2 (+1.5, +0));
  vec4 w2      = texture2D (mask, tx2 + txstep * vec2 (+0, -1.5));
  vec4 w3      = texture2D (mask, tx2 + txstep * vec2 (+0, +1.5));
  vec4 bg      = texture2D (background, tx2);
  vec3 bmp     = texture2D (papernorm,  tx3).rgb;
  vec4 couleur = texture2D (colormap,   tx1i);    // Sum of weighted particles' colors.
  vec4 weights = texture2D (mapweights, tx1i);    // Color-field weights.

  // FIXME Paint density should increase granulation.
  float opacity         = renderpar0.r;
  float edge_intensity  = renderpar0.g;
  float bump_intensity  = renderpar0.b;
  float noise_intensity = renderpar0.a;

  // Expand the bump-map into a normalized signed vector.
  bmp = 2.0 * bmp - 1.0;
  // Find the dot product between the light direction and the normal.
  float NdotL = max (dot (bmp, lightdir), 0.0);
        NdotL = mix (1.0, NdotL, 0.1 * bump_intensity);

  // Resulting color.
  vec3 c;
  
  // Distance to the masked border.
  vec4 bordi = vec4 (tx2.xy, vec2 (1.0, 1.0) - tx2.xy);
  if (any (lessThan (bordi, bordersz))) {
    // BG color with bump map or colored border.
    c = mix (bg.rgb * NdotL, borderclr.rgb, borderclr.a);
  } else {
    // Paint density and granulation at fragment.
    float density     = weights.g / weights.r;
    float granulation = weights.b / weights.r;
  
    // FIXME Skip, if empty.
    //if (density < 0.001)
    //discard;
  
    // Weighted-average of the particles' colors.
    couleur.rgb = clamp (couleur.rgb / weights.r, 0.0, 1.0);

    // Pixel (color) intensity.
    float clr_y = dot (couleur.rgb, vec3 (0.299, 0.587, 0.114));
    // Paper depth.
    float bmp_y = 1.0 - clamp (dot (bmp, vec3 (0.333, 0.333, 0.333)), 0.0, 1.0);

    // Edge intensity of stroke pixel.
    float edge = max (abs (w1 - w0), abs (w3 - w2)).r;
  
    // Granulation noise.
    //float persist = 0.5;
    /*
      float ns = snoise2 (tx4 * 200.0) +
      snoise2 (tx4 * 120.0) * persist + 
      snoise2 (tx4 *  70.0) * persist * persist +
      snoise2 (tx4 *  40.0) * persist * persist * persist + 
      snoise2 (tx4 *  20.0) * persist * persist * persist * persist;
    */
    float gop = 0.0;                
    float ns = 0.4 * snoise2 (tx4 * 200.0) +
      0.3 * snoise2 (tx4 * 120.0) + 
      0.1 * snoise2 (tx4 *  70.0) +
      0.1 * snoise2 (tx4 *  40.0) + 
      0.1 * snoise2 (tx4 *  20.0);
    if (ns < 0.4)
      ns *= 0.5;
    else
      gop += ns;
  
    // Paint density increase the opacity.
    // FIXME Paint granulation may increase the opacity?
    opacity = min (1.0, opacity + 0.1 * gop * granulation + 0.04 * max (0.0, density - 1.0));
    // Granulation is higher at dense areas.
    granulation *= (1.0 + 0.1 * density);
    // Granulation only affects the paper caveats and
    // is visible only on dark colors.
    granulation *= mix (bmp_y, 1.0, gop) * (1.0 - clr_y);
    granulation *= ns;
  
    density = clamp (density, 0.0, 1.0);
  
    // Add some noise.
    couleur.rgb = clamp (couleur.rgb + ns * noise_intensity, 0.0, 1.0);
  
    // Scattering component.
    vec3 S = mix (WHITE.rgb, couleur.rgb, density);
    // Apply the paint granulation.
         S *= 1.0 - min (0.9, granulation);
       
    // Absorbing component.
    vec3 K = mix (bg.rgb, couleur.rgb, min (1.0, density + granulation));

    // Now do the colorful magic to obtain the final fragment color:
    //
    // Apply the opacity.
    c = mix (S * bg.rgb, K, opacity);
    // Darken the edges.
    c *= 1.0 - edge_intensity * edge * (1.0 - clr_y) * sigmoid (density);
    // Fade to BG if outside the mask.
    c = mix (bg.rgb, c, w.r);
    // Apply the bump map.
    c *= NdotL;
  }

  //gl_FragColor = vec4 (ns, ns, ns, 1.0);
  //gl_FragColor = vec4 (w.rgb, 1.0);
  //gl_FragColor = vec4 (density, density, density, 1.0);
  gl_FragColor = vec4 (c, 1.0);
}

//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
// 

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise2 (vec2 v) {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
// First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

// Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

// Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
		+ i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

// Gradients: 41 points uniformly over a line, mapped onto a diamond.
// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

// Normalise gradients implicitly by scaling m
// Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

// Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
