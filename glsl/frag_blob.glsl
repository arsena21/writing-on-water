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

uniform sampler2D mask;         // Blob mask.
uniform sampler2D papernorm;    // Normal map of paper texture.
uniform vec2 txmul;             // Texcoords transform.
uniform vec2 txstep;
uniform vec2 jagged;            // Stroke roughness (on_edge, inside).

varying vec2 tx1;
varying vec3 fragclr;
varying vec4 fragpos;

float myrand (vec2 co){
    return fract (sin (dot (co.xy ,vec2 (12.9898,78.233))) * 43758.5453);
}

void main () {
    // Transform the coords for paper texture.
    vec2 tx2 = fragpos.xy * txmul + vec2 (0.5, 0.5);
    
    vec4 w0  = texture2D (mask, tx1 + txstep * vec2 (-1.5, +0));
    vec4 w1  = texture2D (mask, tx1 + txstep * vec2 (+1.5, +0));
    vec4 w2  = texture2D (mask, tx1 + txstep * vec2 (+0, -1.5));
    vec4 w3  = texture2D (mask, tx1 + txstep * vec2 (+0, +1.5));  
    vec4 w   = texture2D (mask, tx1);
    
    vec3 bmp = texture2D (papernorm, tx2).rgb;

    float r = length (2.0 * abs (tx1 - vec2 (0.5, 0.5)));
    float edge = max (
        // Fragment's closeness to the mask edges.
        max (abs (w1 - w0), abs (w3 - w2)).r,
        // Fragment's closeness to the stroke edges.
        r * r
    );
    
    //float edge = w0.g + w1.g + w2.g + w2.g - 4.0 * w.r;
    
    // Paper height.
    float bmp_y = clamp (dot (bmp, vec3 (0.333, 0.333, 0.333)), 0.0, 1.0);

    // Stroke mask threshold.
    float t = mix (jagged.g, jagged.r, edge) + 0.2 * myrand (tx2);

    gl_FragColor = vec4 (fragclr, bmp_y * w.r > t ? 1.0 : 0.0);
}
