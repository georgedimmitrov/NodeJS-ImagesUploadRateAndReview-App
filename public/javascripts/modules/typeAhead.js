import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHTML(images) {
  return images.map((image) => {
    return `
      <a href="/image/${image.slug}" class="search__result">
        <strong>${image.name}</strong>
      </a>
    `;
  }).join('');
}

function typeAhead(search) {
  if (!search) {
    return;
  }

  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  searchInput.on('input', function() {
    // if no value, quit it!
    if (!this.value) {
      searchResults.style.display = 'none';
      return;
    }

    // show the search results
    searchResults.style.display = 'block';
    
    axios
      .get(`/api/search?q=${this.value}`)
      .then((res) => {
        if (res.data.length) {
          searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
          return;
        }

        // nothing came back
        searchResults.innerHTML = dompurify.sanitize(`<div className="search__result">
          No results for ${this.value} found!
        </div>`);
      })
      .catch((err) => {
        console.error(err);
      });
  });

  // handle keyboard
  searchInput.on('keyup', (ev) => {
    // down 40, up 38, enter 13
    if (![38, 40, 13].includes(ev.keyCode)) {
      return;
    }

    const activeClass = 'search__result--active';
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll('.search__result');
    let next;
    if (ev.keyCode === 40 && current) {
      next = current.nextElementSibling || items[0];
    } else if (ev.keyCode === 40) {
      next = items[0];
    } else if (ev.keyCode === 38 && current) {
      next = current.previousElementSibling || items[items.length - 1];
    } else if (ev.keyCode === 38) {
      next = items[items.length - 1];
    } else if (ev.keyCode === 13 && current.href) {
      window.location = current.href;
    }
    
    if (current) {
      current.classList.remove(activeClass);
    }
    next.classList.add(activeClass);
  });
}

export default typeAhead;
