# mercurius-validation

![CI workflow](https://github.com/mercurius-js/validation/workflows/CI%20workflow/badge.svg)

Mercurius Validation is a plugin for [Mercurius](https://mercurius.dev) that adds configurable validation support.

## Docs

- [Install](#install)
<!-- TODO:  -->
- [Quick Start](#quick-start)
<!-- TODO:  -->
- [Examples](#examples)
- [Benchmarks](#benchmarks)
<!-- TODO -->
- [API](docs/api/options.md)
<!-- TODO -->
- [Errors](docs/errors.md)
<!-- TODO -->
- [Federation](docs/federation.md)

## Install

```bash
npm i fastify mercurius mercurius-validation
```

## Benchmarks

### Normal GraphQL Server Mode | Without Validation

Last run: `2021-09-18`

```text
Running 10s test @ http://localhost:3000/graphql
100 connections

┌─────────┬──────┬──────┬───────┬───────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼───────┼─────────┼─────────┼───────┤
│ Latency │ 6 ms │ 6 ms │ 13 ms │ 19 ms │ 6.83 ms │ 2.62 ms │ 64 ms │
└─────────┴──────┴──────┴───────┴───────┴─────────┴─────────┴───────┘
┌───────────┬────────┬────────┬─────────┬─────────┬──────────┬─────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%     │ 97.5%   │ Avg      │ Stdev   │ Min    │
├───────────┼────────┼────────┼─────────┼─────────┼──────────┼─────────┼────────┤
│ Req/Sec   │ 8015   │ 8015   │ 14431   │ 14911   │ 13649.28 │ 1899.44 │ 8013   │
├───────────┼────────┼────────┼─────────┼─────────┼──────────┼─────────┼────────┤
│ Bytes/Sec │ 3.5 MB │ 3.5 MB │ 6.31 MB │ 6.52 MB │ 5.96 MB  │ 830 kB  │ 3.5 MB │
└───────────┴────────┴────────┴─────────┴─────────┴──────────┴─────────┴────────┘

Req/Bytes counts sampled once per second.

150k requests in 11.04s, 65.6 MB read
```

### Normal GraphQL Server Mode | With Validation

Last run: `2021-09-18`

```text
Running 10s test @ http://localhost:3000/graphql
100 connections

┌─────────┬──────┬──────┬───────┬───────┬────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg    │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼───────┼────────┼─────────┼───────┤
│ Latency │ 6 ms │ 6 ms │ 13 ms │ 19 ms │ 6.8 ms │ 2.86 ms │ 84 ms │
└─────────┴──────┴──────┴───────┴───────┴────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┼─────────┤
│ Req/Sec   │ 7531    │ 7531    │ 14783   │ 15071   │ 13784.19 │ 2108.74 │ 7531    │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┼─────────┤
│ Bytes/Sec │ 3.29 MB │ 3.29 MB │ 6.46 MB │ 6.59 MB │ 6.02 MB  │ 921 kB  │ 3.29 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴─────────┴─────────┘

Req/Bytes counts sampled once per second.

152k requests in 11.04s, 66.3 MB read
```

### Gateway GraphQL Server Mode | Without Validation

Last run: `2021-09-18`

```text

```

### Gateway GraphQL Server Mode | With Validation

Last run: `2021-09-18`

```text

```

## License

MIT
