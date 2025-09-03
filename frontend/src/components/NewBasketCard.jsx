import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import { getRandomNewBasketName, createNewBasket } from "../services/services";

// the "create a new basket" container on homepage
function NewBasketCard ({ setBaskets }) {
  const domainName = `${window.location.origin}/`;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creationResult, setCreationResult] = useState(null);
  const [fieldError, setFieldError] = useState('');
  const [newBasketName, setNewBasketName] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    // add a flag to avoid race conditions with async operations
    let ignore = false;
    (async () => {
      try {
        const name = await getRandomNewBasketName();
        if (!ignore) setNewBasketName(name ?? '');
      } catch (err) {
        console.error(err);
      }
    })();

    return () => { ignore = true };
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = (e) => {
    e?.preventDefault();
    setIsModalOpen(false);
  };

  const validateName = (name) => {
    if (!name) return 'Please provide a basket name.';
    if (!/^[A-Za-z0-9]{1,100}$/.test(name)) {
      return 'Invalid name. Only letters and digits, max 100 characters.';
    }
    return '';
  };

  const ModalContent = () => {
    if (!creationResult) return null;
    const { status, message, name } = creationResult;

    if (status === 'success') {
      return (
        <>
          <p>{message}</p>
          <div className="actions">
            <button type="button" className="close-btn" onClick={closeModal}>
              Close
            </button>
            <button 
              type="button" 
              className="open-btn" 
              onClick={() => {
                closeModal();
                if (name) navigate(`/web/${name}`);
              }}
            >
              Open Basket
            </button>
          </div>
        </>
      );
    } else {
      return (
        <>
          <p>{message}</p>
          <div className="actions">
            <button type="button" className="close-btn" onClick={closeModal}>
              Close
            </button>
          </div>
        </>
      )
    }
  };

  const refreshCard = async () => {
    try {
      const name = await getRandomNewBasketName();
      setNewBasketName(name ?? '');
    } catch (err) {
      console.error('Failed to refresh name', err);
    };
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const basketName = newBasketName.trim();
    const error = validateName(basketName);
    if (error) {
      setFieldError(error);
      inputRef.current?.focus();
      return;
    }
    setFieldError('');

    try {
      await createNewBasket(basketName);
      setBaskets(prev => prev.includes(basketName) ? prev : [basketName, ...prev]);
      setCreationResult({ 
        status: 'success', 
        message: `Basket ${basketName} is successfully created!`,
        name: basketName,
      });
      await refreshCard();
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        await refreshCard();
        setCreationResult({ 
          status: 'conflict', 
          message: `Failed to create basket: ${basketName} - basket already exists.`
        });
      } else if (status === 400 || status === 414) {
        await refreshCard();
        setCreationResult({ 
          status: 'invalid', 
          message: `Failed to create basket: name is invalid.`
        });
      } else {
        setCreationResult({
          status: 'error', 
          message: `Failed to create basket: ${err}.`
        });
      };
    }
    openModal();
  };

  return (
    <div className="new-basket-card">
      <h1>New Basket</h1>
      <p>Create a basket to collect and inspect HTTP requests</p>
      <form className="new-basket-form" onSubmit={handleFormSubmit} noValidate>
        <label htmlFor="basket-name-input">{domainName}</label>
        <input
          type="text"
          id="basket-name-input"
          value={newBasketName} 
          ref={inputRef}
          maxLength={100}
          placeholder="type a name"
          onChange={(e) => {
            if (fieldError) setFieldError('');
            setNewBasketName(e.target.value);
          }}
        />
        <button type="submit" className="create-btn">Create</button>
        {fieldError && (
          <p id="basket-name-error" className="field-error" role="alert">
            {fieldError}
          </p>
        )}
      </form>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <ModalContent />
      </Modal>
    </div>
  );
}

export default NewBasketCard;
