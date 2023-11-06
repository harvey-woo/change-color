import { MiniREngine } from './miniRenderer/engine/MiniREngine';
import { RenderableUnit } from './miniRenderer/engine/entity/RenderableUnit';
import { ImageTexture } from './miniRenderer/engine/texture/ImageTexture';
import { Shader } from './miniRenderer/engine/material/Shader';
import { canvasToBlob } from './canvas-to-blob';
import getChangeColorParams from './get-change-color-params';

type ChangeColorParams = {
  maxValCurI: number,
  mean: number,
  minValCurI: number,
  variance: number,
};

const vtxGLSLSrc0 = `
  precision mediump float;
  attribute vec3 a_vs;
  void main()	{
    gl_Position = vec4( a_vs, 1.0 );
  }
`;
const fragGLSLSrc0 = `
  precision mediump float;
  uniform sampler2D tex01;

  uniform float variance;
  uniform float mean;
  uniform float minValCurI;
  uniform float maxValCurI;

  uniform vec4 param;
  uniform vec4 factorColor;


  vec3 rgb2gray(vec3 c){
    float gray = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    return vec3(gray, gray, gray);
  }
  vec4 toOpenCVFormatHLS(vec4 color)
  {
    color.r = color.r * 180.;
    color.g = color.g * 255.;
    color.b = color.b * 255.;
    return color;
  }

  void hls2rgb(vec4 hls, out vec4 outcol)
  {
    float m1, m2, h1, h, l, s, r, g, b;

    h = hls[0];
    l = hls[1];
    s = hls[2];

    if (l <= 0.5)
    {
      m2 = l * (1.0 + s);
    }
    else
    {
      m2 = l + s - l*s;
    }
    //不降精度改色会有问题,暂作兼容处理
    m2 = floor(m2 * 100000.0) / 100000.0;
    m1 = 2.0 * l - m2;
    float mDiff = m2 - m1;

    if(s == 0.0)
    {
      r = g = b = l;
    }
    else
    {
      h1 = h + 0.3333;
      if(h1 > 1.0)
      {
        h1 -= 1.0;
      }
      if(h1 < 0.1667)
        r = (m1 + mDiff * h1 * 6.0);
      else if(h1 < 0.5 && h1 >= 0.1667)
        r = m2;
      else if(h1 > 0.6667)
        r = m1;
      else
        r = m1 + mDiff * (0.6667 - h1) * 6.0;

      if(r > 1.0)
      {
        r = 1.0;
      }

      h1 = h;

      if(h1 < 0.1667)
        g = (m1 + mDiff * h1 * 6.0);
      else if(h1 < 0.5 && h1 >= 0.1667)
        g = m2;
      else if(h1 > 0.6667)
        g = m1;
      else
        g = m1 + mDiff * (0.6667 - h1) * 6.0;

      if(g > 1.0)
      {
        g = 1.0;
      }

      h1 = h - 0.3333;
      if(h1 < 0.0)
        h1 += 1.0;

      if(h1 < 0.1667)
        b = (m1 + mDiff * h1 * 6.0);
      else if(h1 < 0.5 && h1 >= 0.1667)
        b = m2;
      else if(h1 > 0.6667)
        b = m1;
      else
        b = m1 + mDiff * (0.6667 - h1) * 6.0;
      if(b > 1.0)
        b = 1.0;
    }
    outcol = vec4(r, g, b, hls.w);
  }
  void rgb2hls(vec4 rgb, out vec4 outcol)
  {
    float cmax, cmin, h, l, s, cdelta;
    vec3 c;

    cmax = max(rgb[0], max(rgb[1], rgb[2]));
    cmin = min(rgb[0], min(rgb[1], rgb[2]));
    cdelta = cmax - cmin;
    c = (vec3(cmax) - rgb.xyz) / cdelta;

    l = (cmax + cmin) / 2.0;
    if(cdelta > 0.0)
    {
      if(l <= 0.5)
        s = (cmax - cmin) / (cmax + cmin);
      else
        s = (cmax - cmin) / (2.0 - cmax - cmin);

      if(cmax == rgb.x)
        h = c[2] - c[1];
      else if(cmax == rgb[1])
        h = c[0] - c[2] + 2.0;
      else if(cmax == rgb[2])
        h = c[1] - c[0] + 4.0;

      h /= 6.0;

      if(h < 0.0)
        h += 1.0;
    }
    else
    {
      h = 0.0;
      s = 0.0;
    }

    outcol = vec4(h, l, s, rgb.w);
  }

  float CalculatenewColorL(float sourceColor, float variance, float mean, float minValCurI, float maxValCurI, float targetColor)
  {
    //calculate the varialce of result
    float upVariance = variance * 2.0;
    float bottomVariance = variance * 2.0;

    upVariance = upVariance > maxValCurI ? maxValCurI : upVariance;
    bottomVariance = bottomVariance > minValCurI ? minValCurI : bottomVariance;

    //decrease the variance when it is small or large value
    float maxVariance = 255.0 - targetColor < targetColor ? 255.0 - targetColor : targetColor;//get small range;

    if (maxVariance < 20.0)
    {
      maxVariance = 6.0 + (maxVariance - 6.0) * 0.5;
    }
    else if (maxVariance >= 40.0)
    {
      maxVariance = 23.8 + (maxVariance - 23.8) * 0.12;
    }
    else
    {
      maxVariance = 13.0 + (maxVariance - 13.0) * 0.4;
    }

    upVariance = upVariance > maxVariance ? maxVariance : upVariance;
    bottomVariance = bottomVariance > maxVariance ? maxVariance : bottomVariance;
    float up = maxValCurI >= 1.0 ? upVariance / maxValCurI : 0.0;
    float bottom = minValCurI >= 1.0 ? bottomVariance / minValCurI : 0.0;

    if(sourceColor < mean)
    {
      return targetColor - (mean - sourceColor) * bottom;
    }
    else
    {
      return targetColor + (sourceColor - mean) * up;
    }
  }
  vec4 changeColorV2(vec4 sourceColor, float variance, float mean, float minValCurI, float maxValCurI, vec4 targetColor)
  {
    vec4 diffuseColor;
    rgb2hls(targetColor, diffuseColor);
    diffuseColor = toOpenCVFormatHLS(diffuseColor);

    // change color
    vec3 outputColor = pow(sourceColor.rgb, vec3(0.45));
    vec3 grayColor = rgb2gray(outputColor);
    vec4 pixelColor;
    pixelColor.rgb = vec3(
      diffuseColor.r / 180.,
      clamp(CalculatenewColorL(grayColor.g * 255., variance, mean, minValCurI, maxValCurI, diffuseColor.g), 0., 255.) / 255.,
      diffuseColor.b / 255.
    );
    hls2rgb(pixelColor, pixelColor);
    pixelColor.rgb = pow(pixelColor.rgb, vec3(2.2));
    pixelColor.a = sourceColor.a;
    return pixelColor;
  }
  void main()	{

    vec2 uv = gl_FragCoord.xy/param.zw;
    vec4 texelColor = texture2D( tex01, uv );
    vec3 rgb = changeColorV2(texelColor, variance, mean, minValCurI, maxValCurI, factorColor).rgb;
    gl_FragColor = vec4( rgb, 1.0 );
  }
`;

export function changeColorDiffuse(
  canvas: HTMLCanvasElement,
  imageData: ImageData,
  diffuseColor: [number, number, number],
  changeColorParams: ChangeColorParams,
) {
  const engine = new MiniREngine();
  engine.initialize({ canvas });
  const tex01 = new ImageTexture(engine.renderer.getGL());
  tex01.flipY = true;
  tex01.setDataFromImage(imageData);
  const unit = new RenderableUnit();
  unit.geometryBuffer!.setVertexs(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]));
  unit.material.params = {
    variance: { value: changeColorParams.variance },
    mean: { value: changeColorParams.mean },
    minValCurI: { value: changeColorParams.minValCurI },
    maxValCurI: { value: changeColorParams.maxValCurI },
    tex01: { value: tex01 },
    param: { value: [1.0, 1.0, imageData.width, imageData.height] },
    factorColor: { value: [diffuseColor[0], diffuseColor[1], diffuseColor[2], 1.0] },
  };
  unit.material.initialize(new Shader(vtxGLSLSrc0, fragGLSLSrc0));
  engine.addRenderableUnit(unit);
  engine.run();
}


export async function changeColor(imageData: ImageData, diffuseColor: [number, number, number]): Promise<Blob> {
  const changeColorParams = await getChangeColorParams(imageData.data);
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  changeColorDiffuse(canvas, imageData, diffuseColor, changeColorParams);

  return canvasToBlob(canvas);
}

export default changeColor;
