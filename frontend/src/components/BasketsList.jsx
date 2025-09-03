import { Link } from 'react-router-dom';

export default function BasketsList({ baskets = [ ] }) {
  return (
    <div>
      <h3>My Baskets</h3>
      <ul>
        {baskets.map((name) => (
          <li key={name}>
            <Link to={`/web/${name}`}>{name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
