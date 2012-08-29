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

uniform sampler2D mapweights0;  // Colormap weights.
uniform sampler2D mapweights1;  // Colormap weights.
//uniform sampler2D mask;         // Stroke mask.
varying vec2 tx1;

void main() {
    vec2 tx1i = vec2 (1.0, -1.0) * tx1 + vec2 (0.0, 1.0);
    vec4 w0 = texture2D (mapweights0, tx1i);
    vec4 w1 = texture2D (mapweights1, tx1i);
    //float m = texture2D (mask, tx1).r;

    // Normalize the weighted sum of timestamps
    // and apply a mask.
    float time = w1.g / w0.r;
    
    gl_FragColor = vec4 (time, 0.0, 0.0, 1.0);
}
