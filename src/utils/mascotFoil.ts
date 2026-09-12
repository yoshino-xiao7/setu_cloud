// View-driven foil adapted from Holo Card Studio (MIT). See public/licenses/holo-card-studio.txt.
const vertex = `attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=vec2((aPosition.x+1.)*.5,1.-(aPosition.y+1.)*.5);gl_Position=vec4(aPosition,0.,1.);}`
const fragment = `precision highp float;
varying vec2 vUv; uniform float uPass; uniform vec2 uView; uniform float uFoil,uTime;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec3 spectrum(float t){t=fract(t);vec3 pink=vec3(1.,.32,.62),yellow=vec3(1.,.85,.32),blue=vec3(.22,.62,1.);if(t<.35)return mix(pink,yellow,t/.35);if(t<.7)return mix(yellow,blue,(t-.35)/.35);return mix(blue,vec3(1.),(t-.7)/.3);}
void main(){
 vec2 uv=vUv;
 vec2 angle=uv+uView*1.6;
 float wave=.5+.5*sin((angle.x*.848-angle.y*.53)*6.283*.7+3.*noise(angle*1.5));
 vec3 foil=spectrum(wave*.9+noise(uv*4.)*.12);
 float face=smoothstep(.13,.36,length((uv-vec2(.5,.20))*vec2(1.,1.2)));
 float strength=uFoil*(.24+face*.76);
 float sweep=pow(max(0.,sin((uv.x*.83+uv.y*.35+uView.x*1.8+uView.y*.9)*6.283)),14.);
 vec3 shine=foil*sweep*strength*.25;
 vec2 grid=uv*vec2(65.,97.);vec2 id=floor(grid);vec2 f=fract(grid)-.5;
 float seed=hash(id);float twinkle=pow(.5+.5*sin(seed*50.+uTime+uView.x*20.+uView.y*14.),8.);
 float cross=exp(-abs(f.x)*100.-abs(f.y)*9.)+exp(-abs(f.y)*100.-abs(f.x)*9.);
 shine+=vec3(.85,.91,1.)*cross*step(.94,seed)*twinkle*strength*.12;
 float border=1.-smoothstep(.006,.012,min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y)));
 if(uPass<.5)gl_FragColor=vec4(mix(foil,mix(vec3(.82,.78,.67),foil,.7),border),max(strength*.36,border*.75));
 else gl_FragColor=vec4(shine,1.);
}`

/** Procedural reflection only: never uploads or samples character image textures. */
export function createMascotFoil(canvas: HTMLCanvasElement, pass: 'color' | 'shine') {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true })
  if (!gl)
    return null
  const shaders: WebGLShader[] = []
  const program = gl.createProgram()
  const buffer = gl.createBuffer()
  const dispose = () => {
    shaders.forEach(shader => gl.deleteShader(shader))
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
  }
  try {
    if (!program || !buffer)
      throw new Error('Unable to allocate card renderer')
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader)
        throw new Error('Unable to allocate card shader')
      shaders.push(shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error('Card shader compilation failed')
      return shader
    }
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error('Card shader linking failed')
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.uniform1f(gl.getUniformLocation(program, 'uPass'), pass === 'color' ? 0 : 1)
    const view = gl.getUniformLocation(program, 'uView')
    const amount = gl.getUniformLocation(program, 'uFoil')
    const time = gl.getUniformLocation(program, 'uTime')
    return {
      dispose,
      render(x: number, y: number, t: number) {
        const ratio = Math.min(window.devicePixelRatio, 1.5)
        const width = Math.round(canvas.clientWidth * ratio)
        const height = Math.round(canvas.clientHeight * ratio)
        if (!width || !height || gl.isContextLost())
          return
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width
          canvas.height = height
        }
        gl.viewport(0, 0, width, height)
        gl.uniform2f(view, x, y)
        gl.uniform1f(amount, 0.45)
        gl.uniform1f(time, t)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      },
    }
  }
  catch {
    dispose()
    return null
  }
}
