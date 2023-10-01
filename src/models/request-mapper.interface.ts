export type RequestMapperType = 'url'|'header';

export interface RequestMapper {
  type: RequestMapperType;
  match: string;
  convert: string;
  options?: HeaderOptions;
}

export interface HeaderOptions {
  name: string;
}