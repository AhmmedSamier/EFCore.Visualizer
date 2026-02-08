using System;
using System.Collections.Generic;
using System.Data.Common;
using System.IO;
using System.Linq;
using System.Text;

namespace IQueryableObjectSource;

internal class MySqlDatabaseProvider(DbCommand command) : DatabaseProvider(command)
{
    protected override string ExtractPlanInternal(DbCommand command, bool analyze)
    {
        var explain = analyze ? "EXPLAIN ANALYZE" : "EXPLAIN";
        command.CommandText = $"{explain} {command.CommandText}";

        using var reader = command.ExecuteReader();

        if (reader.FieldCount == 1)
        {
            var planBuilder = new StringBuilder();
            while (reader.Read())
            {
                planBuilder.Append(reader.GetValue(0));
            }

            return planBuilder.ToString();
        }

        var headers = Enumerable.Range(0, reader.FieldCount)
            .Select(reader.GetName)
            .ToArray();

        var rows = new List<string[]>();
        while (reader.Read())
        {
            var row = new string[reader.FieldCount];
            for (var i = 0; i < reader.FieldCount; i++)
            {
                row[i] = reader.IsDBNull(i) ? "NULL" : reader.GetValue(i)?.ToString() ?? string.Empty;
            }

            rows.Add(row);
        }

        var widths = new int[headers.Length];
        for (var i = 0; i < headers.Length; i++)
        {
            var maxRowWidth = rows.Count == 0 ? 0 : rows.Max(r => r[i].Length);
            widths[i] = Math.Max(headers[i].Length, maxRowWidth);
        }

        var builder = new StringBuilder();
        foreach (var row in rows)
        {
            AppendRow(builder, row, widths);
        }

        return builder.ToString();
    }

    internal override string GetPlanDirectory(string baseDirectory) => Path.Combine(baseDirectory, "MySQL");

    private static void AppendRow(StringBuilder builder, IReadOnlyList<string> values, IReadOnlyList<int> widths)
    {
        for (var i = 0; i < values.Count; i++)
        {
            if (i > 0)
            {
                builder.Append(" | ");
            }

            builder.Append(values[i].PadRight(widths[i]));
        }

        builder.AppendLine();
    }
}
