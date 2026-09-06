function Pagination({ page, pageSize, total, onPageChange }) {
  const pageCount = Math.ceil(total / pageSize)
  if (pageCount <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="pagination" aria-label="Pagination">
      <span>Showing {start}-{end} of {total}</span>
      <div className="pagination-actions">
        <button type="button" className="secondary-action" onClick={() => onPageChange(page - 1)} disabled={page === 1}>Previous</button>
        <strong>Page {page} of {pageCount}</strong>
        <button type="button" className="secondary-action" onClick={() => onPageChange(page + 1)} disabled={page === pageCount}>Next</button>
      </div>
    </div>
  )
}

export default Pagination
