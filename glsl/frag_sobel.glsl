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

uniform sampler2D tex;
uniform vec2 txstep;
uniform vec4 pxmask;
uniform vec3 kernel[3];
varying vec2 tx1;

void main() {
    float t0 = dot (texture2D (tex, tx1 + vec2 (-txstep.x, -txstep.y)), pxmask);
    float t1 = dot (texture2D (tex, tx1 + vec2 (-0.0,      -txstep.y)), pxmask);
    float t2 = dot (texture2D (tex, tx1 + vec2 (+txstep.x, -txstep.y)), pxmask);
    float t3 = dot (texture2D (tex, tx1 + vec2 (-txstep.x, -0.0)),      pxmask);
    float t4 = dot (texture2D (tex, tx1 + vec2 (-0.0,      -0.0)),      pxmask);
    float t5 = dot (texture2D (tex, tx1 + vec2 (+txstep.x, -0.0)),      pxmask);
    float t6 = dot (texture2D (tex, tx1 + vec2 (-txstep.x, +txstep.x)), pxmask);
    float t7 = dot (texture2D (tex, tx1 + vec2 (-0.0,      +txstep.x)), pxmask);
    float t8 = dot (texture2D (tex, tx1 + vec2 (+txstep.x, +txstep.x)), pxmask);
    float sx = 
        dot (vec3 (t0, t1, t2), kernel[0]) + 
        dot (vec3 (t3, t4, t5), kernel[1]) + 
        dot (vec3 (t6, t7, t8), kernel[2]);
        
    float sy = 
        dot (vec3 (t0, t3, t6), kernel[0]) + 
        dot (vec3 (t1, t4, t7), kernel[1]) + 
        dot (vec3 (t2, t5, t8), kernel[2]);

    float a = length (vec2 (sx, sy));
    gl_FragColor = vec4 (a, a, a, 1.0);
}
