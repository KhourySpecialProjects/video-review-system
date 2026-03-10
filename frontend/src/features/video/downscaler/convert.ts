import {
    Input,
    Output,
    Conversion,
    ALL_FORMATS,
    BlobSource,
    Mp4OutputFormat,
    BufferTarget,
  } from 'mediabunny';
  
  interface DownscaleOptions {
    onProgress?: (pct: number) => void;
  }
  
  export const convert = async (
    file: File,
    { onProgress }: DownscaleOptions = {}
  ): Promise<Blob> => {
    const input = new Input({
      source: new BlobSource(file),
      formats: ALL_FORMATS,
    });
  
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });
  
    const conversion = await Conversion.init({
      input,
      output,
      video: {
          width: 1920,
          height: 1080,
          fit: 'contain',
          hardwareAcceleration: 'prefer-hardware'
      },
    });
  
    if (onProgress) {
      conversion.onProgress = (progress) => {
        onProgress(Math.round(progress * 100));
      };
    }
  
    await conversion.execute();

const { buffer } = output.target;
if (!buffer) throw new Error('Conversion failed: buffer is null');

return new Blob([buffer], { type: 'video/mp4' });
  }