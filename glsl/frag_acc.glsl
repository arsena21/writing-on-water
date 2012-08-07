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

//precision highp float;

uniform sampler2D alphamap;
uniform int pass;
varying vec3 couleur;
varying float density;
varying float granulation;
varying float wetness;
varying float opacity;
varying vec2 tx1;

/**
 * These fragments will be additively blended
 * in the accumulator buffer.
 * FIXME Multiple render targets might be used here if available.
 */
void main () {
  float a = texture2D (alphamap, tx1).a;
  if (a < 0.001)
    discard;

  if (pass == 0) {
    // Weighted sum of particle colors.
    gl_FragColor = vec4 (a * couleur, 1.0);
  }
  if (pass == 1) {
    // Weight the values.
    vec4 w = a * vec4 (
                       density,      // Weighted sum of particle densities.
                       granulation,  // Weighted sum of particle granulations.
                       0.0,
                       0.0
                       );
    
    // Pack the density and granulation.
    //float pck0 = floor (w.r * 256.0) * 4096.0 + floor (w.g * 256.0);
    
    gl_FragColor = vec4 (
                         a,           // Sum of weights.
                         //pck0,        // Packed data.
                         //0.0,
                         w.r,
                         w.g,
                         1.0
                         );
  }
  if (pass == 2) {
     // Weight the values.
    vec4 w = a * vec4 (
                       opacity,      // Weighted sum of particle opacities.
                       wetness,      // Weighted sum of particle wetnesses.
                       0.0,
                       0.0
                       );

    gl_FragColor = vec4 (w.rgb, 1.0);
  }
}
