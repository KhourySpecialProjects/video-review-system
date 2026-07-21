import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { AdminDataTable } from "./AdminDataTable";

type Row = { id: string; name: string };

const rows: Row[] = [{ id: "row-1", name: "Ada" }];
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "name", header: "Name" },
];
const pagination: PaginationState = { pageIndex: 0, pageSize: 10 };

/**
 * Renders the table with the shared required props, letting each test override
 * only the interaction-related props under test.
 */
function renderTable(props: Partial<React.ComponentProps<typeof AdminDataTable<Row>>>) {
  return render(
    <AdminDataTable<Row>
      columns={columns}
      data={rows}
      pageCount={1}
      pagination={pagination}
      onPaginationChange={vi.fn()}
      onRowClick={vi.fn()}
      {...props}
    />,
  );
}

describe("AdminDataTable", () => {
  it("clicking a row calls onRowClick and shows no edit action by default", async () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });

    expect(
      screen.queryByRole("button", { name: "Edit user" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Ada"));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it("with rowClickable=false, the row body is inert and only the pencil triggers edit", async () => {
    const onRowClick = vi.fn();
    const onEditRow = vi.fn();
    renderTable({ onRowClick, onEditRow, rowClickable: false });

    // Row body no longer opens the editor.
    await userEvent.click(screen.getByText("Ada"));
    expect(onRowClick).not.toHaveBeenCalled();

    // The pencil is the sole trigger.
    await userEvent.click(screen.getByRole("button", { name: "Edit user" }));
    expect(onEditRow).toHaveBeenCalledWith(rows[0]);
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
