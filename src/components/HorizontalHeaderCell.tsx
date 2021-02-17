import React from "react";
import { areEqual } from "react-window";
import { useDispatch, useSelector } from "react-redux";
import { n2a } from "../api/converters";
import { between, rerenderCells } from "../api/arrays";
import { RootState } from "../store";
import {
  setCellOption,
  drag,
  selectCols,
  setResizingRect,
} from "../store/inside";
import { InsideState, OutsideState } from "../types";
import { DUMMY_IMG, DEFAULT_WIDTH } from "../constants";
import { setContextMenuPosition } from "../store/outside";
import { Context } from "./GridSheet";

type Props = {
  index: number;
  style: React.CSSProperties;
};

export const HorizontalHeaderCell: React.FC<Props> = React.memo(
  ({ index: x, style: outerStyle }) => {
    const dispatch = useDispatch();
    const colId = n2a(x + 1);

    const { headerHeight, stickyHeaders } = useSelector<
      RootState,
      OutsideState
    >((state) => state["outside"]);
    const {
      matrix,
      choosing,
      cellsOption,
      selectingZone,
      resizingRect,
      horizontalHeadersSelecting,
      sheetHeight,
    } = useSelector<RootState, InsideState>((state) => state["inside"]);

    const defaultWidth = cellsOption.default?.width || DEFAULT_WIDTH;
    const colOption = cellsOption[colId] || {};
    const width = colOption.width || defaultWidth;
    const numRows = matrix.length;
    return (
      <div
        style={outerStyle}
        className={`
      header horizontal
      ${
        stickyHeaders === "both" || stickyHeaders === "horizontal"
          ? "sticky"
          : ""
      }
      ${choosing[1] === x ? "choosing" : ""} 
      ${
        between([selectingZone[1], selectingZone[3]], x)
          ? horizontalHeadersSelecting
            ? "header-selecting"
            : "selecting"
          : ""
      }`}
        draggable
        onContextMenu={(e) => {
          e.preventDefault();
          dispatch(setContextMenuPosition([e.pageY, e.pageX]));
          return false;
        }}
        onClick={(e) => {
          let startX = e.shiftKey ? selectingZone[1] : x;
          if (startX === -1) {
            startX = choosing[1];
          }
          dispatch(selectCols({ range: [startX, x], numRows }));
          dispatch(setContextMenuPosition([-1, -1]));
          return false;
        }}
        onDragStart={(e) => {
          e.dataTransfer.setDragImage(DUMMY_IMG, 0, 0);
          dispatch(selectCols({ range: [x, x], numRows }));
          return false;
        }}
        onDragEnter={() => {
          if (resizingRect[1] === -1) {
            dispatch(drag([numRows - 1, x]));
          }
          return false;
        }}
        onDragOver={(e) => {
          e.dataTransfer.dropEffect = "move";
          e.preventDefault();
        }}
      >
        <div
          className="header-inner"
          style={{ width, height: headerHeight }}
          draggable
        >
          {colOption.label || colId}
        </div>
        <div
          className="resizer"
          style={{ height: headerHeight }}
          draggable={true}
          onDragStart={(e) => {
            dispatch(setResizingRect([-1, x, -1, e.clientX]));
            const resizer = e.currentTarget;
            resizer.style.height = `${sheetHeight}px`;
            resizer.style.opacity = "1";
            e.stopPropagation();
            return false;
          }}
          onDragEnd={(e) => {
            e.preventDefault();
            const [_y, x, _h, clientX] = resizingRect;
            const cell = n2a(x + 1);
            const nextWidth = width + (e.clientX - clientX);
            dispatch(
              setCellOption({
                cell,
                option: { ...colOption, width: nextWidth },
              })
            );
            dispatch(setResizingRect([-1, -1, -1, -1]));
            return true;
          }}
        >
          <i />
        </div>
      </div>
    );
  }
);
