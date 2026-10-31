import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api } from "./api";
import { useToast } from "./state";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Loading,
  Pagination,
} from "./components";
import type { Page } from "./types";

interface Customer {
  id: string;
  email: string;
  name: string;
  allocated: string;
  completed_checks: number;
}
interface Usage {
  kind: string;
  status: string;
  cost: string;
  created_at: string;
  document__word_count: number;
}
export function ResellerCustomers() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [usagePage, setUsagePage] = useState(1);
  const customers = useQuery({
    queryKey: ["customers", page],
    queryFn: async () =>
      (
        await api.get<Page<Customer>>("referrals/customers/", {
          params: { page },
        })
      ).data,
  });
  const usage = useQuery({
    queryKey: ["customer-usage", selected?.id, usagePage],
    enabled: !!selected,
    queryFn: async () =>
      (
        await api.get<Page<Usage>>(
          `referrals/customers/${selected?.id}/usage/`,
          { params: { page: usagePage } },
        )
      ).data,
  });
  return (
    <>
      <Card>
        <h2>Your connected customers</h2>
        <p>
          Invite customers to enter your reseller code in Account settings. Only
          opted-in customers appear here. Documents and reports remain private.
        </p>
        <ErrorBox error={customers.error} />
        {customers.isPending ? (
          <Loading />
        ) : !customers.data?.results.length ? (
          <Empty text="Your customers can connect using your referral code as their reseller code." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Allocated</th>
                  <th>Completed checks</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {customers.data.results.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.name || c.email}
                      <small className="table-subtext">{c.email}</small>
                    </td>
                    <td>{c.allocated} credits</td>
                    <td>{c.completed_checks}</td>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => {
                          setSelected(c);
                          setUsagePage(1);
                        }}
                      >
                        Usage history <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          count={customers.data?.count || 0}
          change={setPage}
        />
      </Card>
      {selected && (
        <Card>
          <div className="card-heading">
            <h2>Usage · {selected.email}</h2>
            <Button secondary onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
          <ErrorBox error={usage.error} />
          {usage.isPending ? (
            <Loading />
          ) : !usage.data?.results.length ? (
            <Empty text="No checks have been submitted by this customer." />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Check</th>
                    <th>Status</th>
                    <th>Credits</th>
                    <th>Words</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.data.results.map((u, i) => (
                    <tr key={i}>
                      <td>{u.kind}</td>
                      <td>
                        <Badge status={u.status}>{u.status}</Badge>
                      </td>
                      <td>{u.cost}</td>
                      <td>{u.document__word_count}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={usagePage}
            count={usage.data?.count || 0}
            change={setUsagePage}
          />
        </Card>
      )}
    </>
  );
}
export function ResellerPreference() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("reseller") || "");
  const toast = useToast();
  const client = useQueryClient();
  const data = useQuery({
    queryKey: ["reseller-preference"],
    queryFn: async () =>
      (
        await api.get<{ reseller: { name: string; email: string } | null }>(
          "referrals/reseller/",
        )
      ).data,
  });
  const save = useMutation({
    mutationFn: async (value: string) =>
      api.post("referrals/reseller/", { code: value }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["reseller-preference"] });
      toast("Reseller preference updated.");
    },
  });
  return (
    <Card>
      <h2>Connect a reseller</h2>
      <p>
        Optional: a reseller can allocate credits to your account. Linking also
        permits them to see check types, status, dates, word counts and credit
        costs. Your document text, titles and reports stay private. Disconnect
        at any time.
      </p>
      <ErrorBox error={data.error} />
      {data.data?.reseller && (
        <div className="notice">
          Connected to {data.data.reseller.name || data.data.reseller.email} ·{" "}
          {data.data.reseller.email}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(code);
        }}
      >
        <label>
          Reseller code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={12}
            required
          />
        </label>
        <ErrorBox error={save.error} />
        <div className="button-row">
          <Button disabled={save.isPending}>
            Connect & share usage metadata
          </Button>
          {data.data?.reseller && (
            <Button
              secondary
              disabled={save.isPending}
              onClick={() => save.mutate("")}
            >
              Disconnect reseller
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
