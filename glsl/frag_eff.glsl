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

uniform sampler2D mask;         // Stroke mask.
uniform float shinea;           // Shiny line intencity.
uniform vec4 shineln;           // Shiny line equation.
uniform vec2 txmul;             // Fragment position transform.
uniform vec4 circle;            // Circular indicator state (cx, cy, r, angle).

varying vec2 tx1;               // Texture coordinates.
varying vec4 fragpos;

const float PI = 3.14159265358979323846264;


void main () {
  // Fragment position.
  vec2 tx2 = fragpos.xy * txmul * vec2 (1.0, -1.0) + vec2 (0.5, 0.5);
  // Transform the coords into aspect=1:1.
  vec2 txnorm = max (txmul.x, txmul.y) / txmul.xy;
  
  // Final color (will be here).
  vec4 r = vec4 (0.0, 0.0, 0.0, 0.0);
  
  // Invert the tex-coords.
  // FIXME Arrghh... when shall I get rid of these hacks?
  vec2 tx1i = vec2 (0.0, 1.0) + vec2 (1.0, -1.0) * tx1;
  vec4 w = texture2D (mask, tx1i);
  if (w.r > 0.001) {
      // Shiny line intensity in position.
      // (point-to-line distance)
      float g = dot (shineln.rgb, vec3 (tx2, 1.0)) * shineln.a;
            g = max (0.0, 1.0 - 128.0 * g * g);
            g *= shinea * w.r;

            r = vec4 (1.0, 1.0, 1.0, g);
   }

  // Paint the commit timer as a circle.
  // The closest point on circle:
  vec2 p = circle.z * normalize (tx1 - circle.xy) / txnorm;
  if (length (tx1 - circle.xy - p) < 0.01) {
    // If we're close enough, check the angle.
    float a = (atan (p.y, p.x) + PI) / (2.0 * PI);
    if (a < circle.w) {
        // Unfinished/Disabled.
        // r = vec4 (0.0, 0.8, 0.1, 0.5);
    }
  }

  gl_FragColor = r;
}
