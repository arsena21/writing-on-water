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

/**
 * Particle system with the grid helper
 * for faster neighbours search.
 * @constructor
 */
function ParticleGrid () {
    var PARTICLE_R     = 32;        // Normal particle radius.
    var PARTICLE_R2    = 32 * 32;   // Squared value.
    var PARTICLE_H     = 48;        // Radius of the smoothing kernel.
    var PARTICLE_H2    = 48 * 48;   // Squared value.
    var REST_DENSITY   = 1.0;       // Particle rest density.
    /**
      * @const */
    var INF = new THREE.Vector4 (   // Out-of-scene vertex position.
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        0.0
    );

    var w = PARTICLE_R * 2;
    var h = PARTICLE_R * 2;
    var w1 = 1.0 / w;
    var h1 = 1.0 / h;

    var grid = {};
    var list = [];

    /**
      * Neighbouring cells offsets.
      * @const */
    var pp = [0, -1024, +1024,
             -1, -1025, +1023,
             +1, -1023, +1025];

    this.MAX_PARTICLES = 1000;
    this.PARTICLE_R    = PARTICLE_R;
    this.PARTICLE_R2   = PARTICLE_R2;
    this.badVector     = INF;

    this.time = new Date().getTime();
    
    this.hash = function (x, z) {
        return Math.floor (z * h1) * 1024.0 + Math.floor (x * w1);
    };

    this.count = function () {
        return list.length;
    };

    this.addParticle = function (p) {
        var h = this.hash (p.position.x, p.position.z);
        if (!grid[h]) {
             grid[h] = [];
        }

        // Save particle's hash value to check if
        // it has been moved between the grid cells.
        p.last_hash = h;
        grid[h].push (p);
        list.push (p);
    };
    
    this.removeParticle = function (p) {
        if (!p.last_hash) {
            p.last_hash = this.hash (p.position.x, p.position.z);
        }

        var a = grid[p.last_hash];
        if (a) {
            for (var k = 0; k < a.length; k++) {
                if (p == a[k]) {
                    a.splice (k, 1);
                    break;
                }
            }

            for (var k = 0; k < list.length; k++) {
                if (p == list[k]) {
                    list.splice (k, 1);
                    break;
                }
            }
        }
    };
    
    /**
     * Move the particle from one cell into another
     * if its position has changed enough.
     */
    this.checkCell = function (p) {
        var new_hash = this.hash (p.position.x, p.position.z);
        if (p.last_hash == new_hash) {
            return true;
        }

        var a = grid[p.last_hash];  // Current cell.
        var b = grid[new_hash];     // New cell.
        if (!a) {                   //
            return false;           // This must never happen. x_x'
        }
        if (!b) {
            // Uncomment to prohibit the grid expansion.
            // return false;
            // Create a new cell if not found.
            b = [];
            grid[new_hash] = b;
        }

        // Remove the particle from its original cell.
        for (var k = 0; k < a.length; k++) {
            if (p == a[k]) {
                a.splice (k, 1);
                break;
            }
        }
        
        // Add the particle into a new cell.
        b.push (p);
        p.last_hash = new_hash;
        
        return true;
    };
    
    // Construct the list of particle's neighbours.
    this.neighbourhood = function (p, r2) {
        // Cache the neighbours list.
        // FIXME Time threshold is experimental.
        if (this.time - p.n_time < 100)
            return p.neighbours;

        var pos = p.position;

        // Enum the neighbouring cells.
        var n;
        if (p.neighbours) {
            n = p.neighbours;
            n.length = 0;
        } else {
            n = [];
        }

        var i = 8;
        var h = p.last_hash;
        do {
            var a = grid[h + pp[i]];
            if (a) {
                // Extract all particles in the cell.
                if (r2 == undefined) {
                    n = n.concat (a);
                    if (i == 0) { // (pp[i] == 0)
                        var j = n.indexOf (p);
                        if (j >= 0) {
                            n.splice (j, 1);
                        }
                    }
                } else {
                    // Extract the particles with distance check.
                    for (var j = 0, len = a.length; j < len; j++) {
                        var p1 = a[j];
                        if (p1.position.distanceToSquared (pos) < r2) {
                            if (p1 != p) {
                                n.push (p1);
                            }
                        }
                    }
                }
            }
            i--;
        } while (i >= 0);

        p.neighbours = n;
        p.n_time = this.time;
        return n;
    };
    
    // Construct the list of all particles.
    this.allParticles = function () {
        return list;
    };
    
    this.particlesAtPoint = function (p, r) {
        var pp = {
            position: p,
            last_hash: this.hash (p.x, p.z)
        };
        var n = this.neighbourhood (pp, r);
        var n1 = [];
        
        // Discard the pylons.
        for (var i = 0; i < n.length; i++) {
            if (n[i].is_pylon == false) {
                n1.push (n[i]);
            }
        }
        
        return n1;
    };
    
    // Remove all particles.
    this.clear = function () {
        grid = {};
        list = [];
    };

    /**
     * Interact with the particle system and add
     * a new paint particle to the list if neeeded.
     */
    this.particlesInteract = function (point, props, brush, fUpdated) {
        var p = {
                position:  point,
                last_hash: this.hash (point.x, point.z)
            },
            mass      = props.m,
            brush_clr = props.c,
            flow      = 1.0 - props.rt;
    
        // Set the particle radius.
        var r = PARTICLE_R * props.r;
            r = Math.min (r, PARTICLE_R);
            r = Math.max (r, 16);
        
        // Check if the point intersects with some particle.
        var n = this.neighbourhood (p),
            T = props.is_pylon ? r : PARTICLE_R / 3,
            found = false;
        for (var i = 0, len = n.length; i < len; i++) {
            var ni = n[i];
            if (ni.position.distanceTo (point) < T &&
                ni.is_pylon == props.is_pylon) {
                var nic = ni.color,
                    nim = ni.mass,
                    mm  = nim + mass;
                if (mm > 0.001) {
                    // Mix the colors.
                    nic.mix (brush_clr, mass / mm);

                    // Mix the masses.
                    ni.pigment.x = ni.mass = 0.5 * mm;

                    // Set the particle radius to the maximum one.
                    ni.radius_max = Math.max (r, ni.radius_max);

                    // Feedback to the brush.
                    var dm = nim - mass;
                    brush.waterUpdate (0.10 * Math.max (0.0, dm));
                    brush.colorUpdate (0.05 * (1.00 + dm), nic);

                    // If removed:
                    // fUpdated (ni.id * 4, INF, nic);
                }
                
                if (fUpdated) {
                    fUpdated (ni.id * 4, ni.transform, nic, ni.pigment);
                }
                
                found = true;
            }
        }
        if (found && !props.f) {
            return false;
        }

        // Initial particle radius.
        var r0 = found && flow > 0.001 ? 8.0 : r;
        
        // Construct a new particle.
        var part = {
            position: point,
            last_position: point.clone (),
            pigment:   new THREE.Vector4 (mass, props.g, flow, 0.0),    // Pigment description (shader attribute).
            transform: new THREE.Vector4 (                              // Particle position and radius (shader attribute).
                point.x,
                point.y,
                point.z,
                r0
            ),
            rotation:   new THREE.Vector3 (0.0, 0.0, 0.0),              // Particle rotation (debug).
            v:          new THREE.Vector2 (0.0, 0.0),                   // Velocity.
            F:          new THREE.Vector2 (0.0, 0.0),                   // Force.
            norm:       new THREE.Vector2 (0.0, 0.0),                   // Surface normal.
            color:      brush_clr,                                      // Particle color.
            radius:     r0,                                             // Particle radius.
            radius2:    r0 * r0,                                        // Squared value.
            radius_max: r,                                              //
            mass:       mass,                                           // Particle mass.
            is_pylon:   props.is_pylon,                                 // Is the particle a pylon?
            pylon:      undefined,                                      // Closest pylon.
            id:         list.length,                                    // Unique particle Id.
            stroke_id:  props.stroke,                                   // Stroke Id.
            flow:       flow,                                           // Ability to flow.
            last_hash:  undefined,
            pylon_d:    0.0,
            majornorm:  undefined,
            n_time:     undefined,
            neighbours: [],                                             // Neighbours list.
            neighbour_d:[]                                              // Distances to the neighbours.
        };

        this.addParticle (part);
        if (fUpdated) {
            fUpdated (part.id * 4, part.transform, part.color, part.pigment);
        }
    
        return part;
    };

    /**
     * Calculate the forces field and update the 
     * positions of the paint particles
     * DOC: Matthias Muller, David Charypar, Markus Gross.
     *      Particle-Based Fluid Simulation for Interactive Applications. 2003
     */
    this.movePaintParticles = function (paint, dt, status) {
        status.pos_changed = 0;
        status.clr_changed = 0;
        
        var pts = list,
            len = list.length;
        if (!len)
            return 0;
    
        // Skip the following stages if the
        // paint cannot flow anyway.
        if (paint.resistance.value > 0.999) {
            for (var i = 0; i < len; i++) {
                var p = pts[i];
                if (p.radius < p.radius_max) {
                    p.radius = p.transform.w = p.radius_max;
                    status.pos_changed++;
                }
            }
            
            return 0;
        }
        
        // Update densities.
        for (var i = 0; i < len; i++) {
            var p = pts[i];
            if (p.radius < p.radius_max) {
                p.radius++;
                p.radius2 = p.radius * p.radius;
                status.pos_changed++;
            }

            if (p.is_pylon) {
                // Decrease the pylon's force.
                p.F.multiplyScalar (Math.pow (0.99, dt));
            } else {
                p.pylon_d = Number.POSITIVE_INFINITY;
                p.F.set (0, 0);

                // Enum the particle's neighbours.
                this.neighbourhood (p);
                
                // Init density.
                p.density = REST_DENSITY;
                for (var j = 0, jlen = p.neighbours.length; j < jlen; j++) {
                    var d2 = p.neighbours[j].position.distanceToSquared (p.position) / PARTICLE_H2;//p.radius2;
                    if (d2 < 1.0) {
                        p.density += p.mass * Wpoly6_h1 (d2);
                    }

                    // Cache the distance.
                    p.neighbour_d[j] = d2;
                }
            }
        }
    
        var norm = new THREE.Vector2 (),
            r    = new THREE.Vector2 (),
            v    = new THREE.Vector2 (),
            dv   = new THREE.Vector2 ();

        // Init forces.
        for (var i = 0; i < len; i++) {
            var p = pts[i];
            if (p.is_pylon) {
                // Pylons are not affected.
                continue;
            }

            // Particle's pressure.
            var K  = 0.5;
            var Pp = K * (p.density - REST_DENSITY);

            var pos   = p.position;
            var pylon = undefined;
            
            norm.set (0, 0);
            for (var j = 0, jlen = p.neighbours.length; j < jlen; j++) {
                if (p.neighbour_d[j] > 1.0)
                    continue;

                var nj = p.neighbours[j];
                if (nj.is_pylon) {
                    // Add the pylon's force.
                    p.F.addSelf (nj.F);
                    // Update the surface normal and distance.
                    dv.set (pos.x - nj.position.x, pos.z - nj.position.z);
                    var l = dv.lengthSq () / nj.radius2;
                    if (p.pylon_d > l) {
                        p.pylon_d = l;
                        pylon = nj;
                    }
                    // Only accept vectors co-directed with the major normal.
                    if (p.majornorm) {
                        if (p.majornorm.dot (dv) > 0) {
                            norm.addSelf (dv.normalize ());
                        }
                    }
                } else {
                    // Vector to the neighbour.
                    r.set (
                        nj.position.x - pos.x,
                        nj.position.z - pos.z
                    );
                    v.copy (nj.v);
                    
                    var d = r.length () / PARTICLE_H;//p.radius;
                    //if (d >= 1.0)
                        //continue;

                    if (d < 0.2) {
                        // Color diffusion.
                        p.color.mix (nj.color, 0.01 * dt * p.flow);
                        status.clr_changed++;
                    }

                    var Pn = K * (nj.density - REST_DENSITY);
                    var Md = nj.mass / nj.density;
                    //var w  = Wpress_wisc_h1 (d);
                    var d1 = 1.0 - d;
                    var d2 = 14.32394 * d1;
                        d1 *= d2 * d1;

                    // Pressure force.
                    p.F.addSelf (
                        r.normalize ().multiplyScalar (
                            -0.5 * Md * (Pp + Pn) * d1)
                    );

                    // Viscosity force.
                    p.F.addSelf (
                        v.subSelf (p.v).multiplyScalar (paint.viscosity.value * Md * d2)
                    );
                }
            }

            if (pylon) {
                // Particle's major normal.
                p.majornorm = new THREE.Vector2 (pos.x - pylon.position.x,
                                                 pos.z - pylon.position.z);

                //var d = norm.length ();
                p.pylon = pylon;
                p.stroke_id = pylon.stroke_id;
                p.pylon_d = Math.sqrt (p.pylon_d);
                //p.norm.copy (norm.multiplyScalar (1.0 / d));
                p.norm.copy (norm.normalize ());
                // Ignore the normals with small magnitude as they
                // are likely to be within the stroke.
                /*
                if (d < 0.1) {
                    p.pylon_d = 0.01;
                } else {
                    p.pylon_d = Math.sqrt (p.pylon_d);
                }
                */
            } else {
                // If there's no pylon in range, use the cached one.
                if (p.pylon) {
                    p.pylon_d = p.position.distanceTo (p.pylon.position) / p.pylon.radius;
                } else {
                    p.pylon_d = 0.0;
                }
            }

            // Stroke edge resistance.
            if (p.pylon_d > 1.0)
                p.F.addSelf (p.norm.clone ().multiplyScalar (-4.0 * Math.max (0.0, (p.pylon_d - 0.9) / 0.1)));
        }

        // Velocity attenuation is fixed.
        var vatt = 0.8 * (1.0 - paint.resistance.value);

        // Move particles.
        for (var i = 0; i < len; i++) {
            var p = pts[i];
            var pos = p.position;
            if (p.is_pylon) {
                // Pylons do not move.
                p.rotation.y = Math.atan2 (p.F.x, p.F.y);
                continue;
            }

            // Total force and particle's acceleration.
            p.F.addSelf (paint.gravity.clone().multiplyScalar (p.mass));
            var acceleration = p.F.clone().multiplyScalar (dt / p.density);

            // Update the velocity.
            p.v.addSelf (acceleration.multiplyScalar (dt)).multiplyScalar (vatt * p.flow);
            p.flow *= 0.999;
            p.pigment.z = p.flow;

            p.v.multiplyScalar (dt);
            var d = Math.abs (p.v.x) + Math.abs (p.v.y);
            if (d > 0.001) {
                //if (false) {
                // Bounce the velocity vector.
                // Vnew = b * (-2 * (V dot N) * N + V)
                // p.v.addSelf (p.norm.clone().multiplyScalar (-2.0 * a)).multiplyScalar (0.95);
                //}

                // Move particle.
                pos.x += p.v.x;
                pos.z += p.v.y;

                // Check the particle's position in a grid.
                this.checkCell (p);
                if (pos.distanceTo (p.last_position) > 1.0) {
                    p.last_position.copy (pos);
                    p.rotation.y = Math.atan2 (p.v.x, p.v.y);
                    status.pos_changed++;
                }

                p.rotation.y = p.flow;
                p.transform.set (pos.x, pos.y, pos.z, p.radius);

                /*
                if (p.pylon) {
                    var r = p.pylon.position.clone().subSelf (p.position);
                    p.rotation.y = Math.atan2 (r.x, r.z);
                } else {
                    p.rotation.y = Math.atan2 (p.v.x, p.v.y);
                  //p.rotation.y = Math.atan2 (p.norm.x, p.norm.z);
                }
                */
            } else {
                p.transform.w = p.radius;
            }
        }
    
        return 1;
    };
};

function Wpress (x, h) {
    /*if (x > h) return 0.0;
    else */return 14.32394 / Math.pow (h, 6.0) * Math.pow (h - x, 3.0);
}
function Wwisc (x, h) {
    /*if (x > h) return 0.0;
    else */return 14.32394 / Math.pow (h, 6.0) * (h - x);
}
function Wpoly6 (x2, h) {
    /*if (x2 > h * h) return 0.0;
    */return 1.71588923 / Math.pow (h, 9.0) * Math.pow (h * h - x2, 3);
}

// Optimized for h == 1.
function Wpoly6_h1 (x2) {
    var x21 = 1.0 - x2;
    return 1.71588923 * x21 * x21 * x21;//Math.pow (1.0 - x2, 3);
}
