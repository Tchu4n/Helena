import type { ProductView } from "../views.ts";

// PRO-06: the size chart opens in place, without leaving the product screen.
export function SizeGuide({ guide }: { guide: NonNullable<ProductView["sizeGuide"]> }) {
  return (
    <details className="border-y border-line">
      <summary className="flex min-h-12 cursor-pointer items-center text-sm underline">Guia de medidas</summary>
      <div className="overflow-x-auto pb-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {guide.columns.map((column) => (
                <th key={column} scope="col" className="border-b border-line py-2 pr-4 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((row) => (
              <tr key={row.join("|")}>
                {row.map((cell, index) => (
                  <td key={index} className="border-b border-line py-2 pr-4">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
