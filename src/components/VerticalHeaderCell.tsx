import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { between } from "../api/arrays";
import { RootState } from "../store";
import {
  setCellOption,
  drag,
  selectRows,
  setResizingRect,
  setEditorRect,
} from "../store/inside";
import {
  DUMMY_IMG,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  MIN_WIDTH,
} from "../constants";
import { InsideState, OutsideState } from "../types";
import { setContextMenuPosition } from "../store/outside";

type Props = {
  index: number;
  style: React.CSSProperties;
};

export const VerticalHeaderCell: React.FC<Props> = React.memo(
  ({ index: y, style: outerStyle }) => {
    const rowId = `${y + 1}`;
    const dispatch = useDispatch();

    const {
      matrix,
      cellsOption,
      choosing,
      selectingZone,
      verticalHeadersSelecting,
      resizingRect,
      headerWidth,
    } = useSelector<RootState, InsideState>((state) => state["inside"]);

    const defaultHeight = cellsOption.default?.height || DEFAULT_HEIGHT;
    const rowOption = cellsOption[rowId] || {};
    const height = rowOption.height || defaultHeight;
    const numCols = matrix[0]?.length || 0;

    return (
      <div
        style={outerStyle}
        className={`
      header vertical
      ${choosing[0] === y ? "choosing" : ""} 
      ${
        between([selectingZone[0], selectingZone[2]], y)
          ? verticalHeadersSelecting
            ? "header-selecting"
            : "selecting"
          : ""
      }`}
        onClick={(e) => {
          let startY = e.shiftKey ? selectingZone[0] : y;
          if (startY === -1) {
            startY = choosing[0];
          }
          dispatch(selectRows({ range: [startY, y], numCols }));
          dispatch(setContextMenuPosition([-1, -1]));
          const rect = e.currentTarget.getBoundingClientRect();
          dispatch(
            setEditorRect([
              rect.top,
              rect.left + rect.width,
              rect.height,
              cellsOption.A?.width || DEFAULT_WIDTH,
            ])
          );
          return false;
        }}
        draggable
        onContextMenu={(e) => {
          e.preventDefault();
          dispatch(setContextMenuPosition([e.pageY, e.pageX]));
          return false;
        }}
        onDragStart={(e) => {
          e.dataTransfer.setDragImage(DUMMY_IMG, 0, 0);
          dispatch(selectRows({ range: [y, y], numCols }));
          const rect = e.currentTarget.getBoundingClientRect();
          dispatch(
            setEditorRect([
              rect.top,
              rect.left + rect.width,
              rect.height,
              cellsOption.A?.width || DEFAULT_WIDTH,
            ])
          );
          return false;
        }}
        onDragEnter={() => {
          if (resizingRect[0] === -1) {
            dispatch(drag([y, numCols - 1]));
          }
          return false;
        }}
        onDragOver={(e) => {
          e.dataTransfer.dropEffect = "move";
          e.preventDefault();
        }}
      >
        <div className="header-inner" style={{ height, width: headerWidth }}>
          {rowOption.label || rowId}
        </div>
        <div
          className="resizer"
          style={{ width: headerWidth }}
          draggable={true}
          onDragStart={(e) => {
            dispatch(setResizingRect([y, -1, e.screenY, -1]));
            e.currentTarget.classList.add("dragging");
            e.stopPropagation();
            return false;
          }}
          onDragEnd={(e) => {
            e.currentTarget.classList.remove("dragging");
            e.preventDefault();
            const [y, _x, screenY, _h] = resizingRect;
            const cell = `${y + 1}`;
            const nextHeight = height + (e.screenY - screenY);
            dispatch(
              setCellOption({
                cell,
                option: {
                  ...rowOption,
                  height: nextHeight > 0 ? nextHeight : MIN_WIDTH,
                },
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
