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
uniform sampler2D mask;
uniform vec2 txstep;
uniform vec4 pxmask;
uniform vec3 kernel[3];
uniform int inside;
varying vec2 tx1;

const vec4 T = vec4 (0.01, 0.01, 0.01, 0.01);

void main() {
    // Stroke mask.
    vec4 m = vec4 (
        texture2D (mask, tx1 + vec2 (-txstep.x, 0.0)).r,
        texture2D (mask, tx1 + vec2 (+txstep.x, 0.0)).r,
        texture2D (mask, tx1 + vec2 (0.0, -txstep.y)).r,
        texture2D (mask, tx1 + vec2 (0.0, +txstep.y)).r
    );
    
    // Texels.
    vec3 t012 = vec3 (
        dot (texture2D (tex, tx1 + vec2 (-txstep.x, -txstep.y)), pxmask),
        dot (texture2D (tex, tx1 + vec2 (-0.0,      -txstep.y)), pxmask),
        dot (texture2D (tex, tx1 + vec2 (+txstep.x, -txstep.y)), pxmask)
    );
    vec3 t345 = vec3 (
        dot (texture2D (tex, tx1 + vec2 (-txstep.x, -0.0)),      pxmask),
        dot (texture2D (tex, tx1 + vec2 (-0.0,      -0.0)),      pxmask),
        dot (texture2D (tex, tx1 + vec2 (+txstep.x, -0.0)),      pxmask)
    );
    vec3 t678 = vec3 (
        dot (texture2D (tex, tx1 + vec2 (-txstep.x, +txstep.x)), pxmask),
        dot (texture2D (tex, tx1 + vec2 (-0.0,      +txstep.x)), pxmask),
        dot (texture2D (tex, tx1 + vec2 (+txstep.x, +txstep.x)), pxmask)
    );

    // Filter and clamp.
    vec2 s = clamp (vec2 (
        dot (t012, kernel[0]) + 
        dot (t345, kernel[1]) + 
        dot (t678, kernel[2]),
        dot (vec3 (t012.x, t345.x, t678.x), kernel[0]) + 
        dot (vec3 (t012.y, t345.y, t678.y), kernel[1]) + 
        dot (vec3 (t012.z, t345.z, t678.z), kernel[2])
    ), -1.0, 1.0);
    
    /*
    if (inside != 0 && any (lessThan (m, T))) {
        s = vec2 (0.0, 0.0);
    }
    */

    // Edge intensity.
    float a = length (s);
    
    // Edge direction transformed into [0, 1].
    s = s * 0.5 + 0.5;
    
    gl_FragColor = vec4 (a, s.x, s.y, 1.0);
}
