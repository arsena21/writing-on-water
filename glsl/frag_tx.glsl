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

uniform sampler2D background;   // Background image.
uniform sampler2D papernorm;    // Normal map of paper texture.
uniform vec3 lightdir;          // Light source direction.
uniform vec2 txmul;             // Texcoords transform.
uniform float bumppower;        // Bump map intensity.
varying vec2 tx1;
varying vec4 fragpos;

void main () {
    // Transform the coords into aspect=1:1 for paper.
    vec2 tx2 = tx1 * max (txmul.x, txmul.y) / txmul.xy;
  
    vec4 bg  = texture2D (background, tx1);
    vec3 bmp = texture2D (papernorm, tx2).rgb;
  
    // Expand the bump-map into a normalized signed vector.
    bmp = 2.0 * bmp - 1.0;
    // Find the dot product between the light direction and the normal.
    float NdotL = max (dot (bmp, lightdir), 0.0);
          NdotL = mix (1.0, NdotL, 0.25 * bumppower);

    gl_FragColor.rgb = bg.rgb * NdotL;
    gl_FragColor.a   = bg.a;
}
