import { parseFromTimeZone } from "date-fns-timezone";
import { CellType } from "../types";
import {TimeDelta} from "../lib/time";

type Condition = (value: string) => boolean;
type Stringify = (value: string) => any;

type Props = {
  condition?: Condition;
  complement?: Stringify;
  mixins?: ParserMixin[];
};

const BOOLS = { true: true, false: false } as { [s: string]: boolean };

export interface ParserMixin {
  parseFunctions?: ((value: string, cell: CellType) => any)[];
  parse?(value: string, cell: CellType): CellType;
  callback?(parsed: any, cell: CellType): any;
  bool?(value: string, cell: CellType): boolean | undefined;
  number?(value: string, cell: CellType): number | undefined;
  timedelta?(value: string, cell: CellType): TimeDelta | undefined;
  date?(value: string, cell: CellType): Date | undefined;
}

export class Parser implements ParserMixin {
  parseFunctions: ((value: string, cell: CellType) => any)[] = [
    this.number,
    this.timedelta,
    this.date,
    this.bool,
  ];

  private condition?: Condition;
  private complement?: Stringify;

  constructor(props?: Props) {
    this.applyMixins(props?.mixins);
    if (props == null) {
      return;
    }
    const { condition, complement } = props;
    this.condition = condition;
    this.complement = complement;
  }

  private applyMixins(mixins?: ParserMixin[]) {
    if (mixins == null) {
      return;
    }
    for (const mixin of mixins) {
      for (const key in mixin) {
        // @ts-ignore
        this[key] = mixin[key];
      }
    }
  }

  public callback(parsed: any, cell: CellType) {
    return parsed;
  }
  public parse(value: string, cell: CellType): CellType {
    try {
      const parsed = this._parse(value, cell);
      return { ...cell, value: parsed };
    } catch (e) {
      return { ...cell, value: e };
    }
  }
  protected _parse(value: string, cell: CellType): any {
    if (this.condition && !this.condition(value)) {
      const result = this.complement ? this.complement(value) : value;
      return this.callback(result, cell);
    }
    if (value[0] === "'") {
      return this.callback(value, cell);
    }
    for (let i = 0; i < this.parseFunctions.length; i++) {
      const result = this.parseFunctions[i](value, cell);
      if (result != null) {
        return this.callback(result, cell);
      }
    }
    if (value === "") {
      return this.callback(null, cell);
    }
    return this.callback(value, cell);
  }

  bool(value: string, cell: CellType): boolean | undefined {
    return BOOLS[value.toLowerCase()];
  }

  number(value: string, cell: CellType): number | undefined {
    const m = value.match(/^-?[\d.]+$/);
    if (
      m != null &&
      value.match(/\.$/) == null &&
      (value.match(/\./g) || []).length <= 1
    ) {
      return parseFloat(value);
    }
  }

  timedelta(value: string, cell: CellType): TimeDelta | undefined {
    if (value.length < 4 || isNaN(value[value.length - 1] as any)) {
      return;
    }
    {
      const match = value.match(/^([+-]?)(\d+):(\d{2})$/);
      if (match) {
        const [, _sign, hours, minutes] = match;
        const sign = _sign === "-"  ? -1 : 1;
        return TimeDelta.create(sign * Number(hours), sign * Number(minutes));
      }
    }
    {
      const match = value.match(/^([+-]?)(\d+):(\d{2}):(\d{2})$/);
      if (match) {
        const [, _sign, hours, minutes, seconds] = match;
        const sign = _sign === "-" ? -1 : 1;
        return TimeDelta.create(sign * Number(hours), sign * Number(minutes), sign * Number(seconds));
      }
    }
    {
      const match = value.match(/^([+-]?)(\d+):(\d{2}):(\d{2})\.(\d+)$/);
      if (match) {
        const [, _sign, hours, minutes, seconds, msecs] = match;
        const sign = _sign === "-" ? -1 : 1;
        return TimeDelta.create(
          sign * Number(hours), sign * Number(minutes),
          sign * Number(seconds), sign * Number(msecs),
        );
      }
    }
  }

  date(value: string, cell: CellType): Date | undefined {
    const first = value[0];
    if (first == null || first.match(/[JFMASOND0-9]/) == null) {
      return;
    }
    if (value[value.length - 1].match(/[0-9Z]/) == null) {
      return;
    }
    let timeZone = "UTC";
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {}
    const d = parseFromTimeZone(value, { timeZone });
    if (d.toString() === "Invalid Date") {
      return;
    }
    return d;
  }
}

export type ParserType = Parser;

export const defaultParser = new Parser();
