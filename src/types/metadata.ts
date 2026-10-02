/**
 * @fileoverview Explicit TypeScript definitions and interfaces for photo metadata,
 * file validation, and Web Worker communication contracts.
 */

export interface FileInfo {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

export interface CameraInfo {
  make: string | null;
  model: string | null;
}

export interface LensInfo {
  model: string | null;
  make: string | null;
}

export interface ExposureInfo {
  iso: number | string | null;
  fNumber: number | null;
  exposureTime: number | null;
  focalLength: number | null;
  focalLengthIn35mm: number | null;
  flash: number | string | null;
  exposureProgram: number | string | null;
  exposureCompensation: number | null;
  whiteBalance: number | string | null;
  meteringMode: number | string | null;
}

export interface DateInfo {
  taken: Date | string | null;
  modified: Date | string | null;
}

export interface DimensionInfo {
  width: number | null;
  height: number | null;
  orientation: number | string | null;
  megapixels: string | null;
}

export interface GpsInfo {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  osmUrl: string | null;
}

export interface NormalizedMetadata {
  hasMetadata: boolean;
  raw: Record<string, unknown>;
  file: FileInfo;
  camera: CameraInfo;
  lens: LensInfo;
  exposure: ExposureInfo;
  date: DateInfo;
  dimensions: DimensionInfo;
  software: string | null;
  gps: GpsInfo;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedFormat?: string;
}

export interface NaturalDimensions {
  width: number | null;
  height: number | null;
}

export type WorkerRequest = {
  type: 'PARSE';
  payload: {
    buffer: ArrayBuffer;
    fileInfo: FileInfo;
    naturalDims?: NaturalDimensions;
  };
};

export type WorkerResponse =
  | {
      type: 'SUCCESS';
      data: NormalizedMetadata;
    }
  | {
      type: 'ERROR';
      error: string;
    };
