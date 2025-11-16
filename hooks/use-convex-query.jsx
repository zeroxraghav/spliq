import { useMutation, useQuery } from "convex/react"
import { useEffect, useState } from "react";
import {toast} from "sonner";

export const useConvexQuery = (query, ...args) => {
  const result = useQuery(query, ...args);
  const [data, setData] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use effect to handle the state changes based on the query result
  useEffect(() => {
    if (result === undefined) {
      setIsLoading(true);
    } else {
      try {
        setData(result);
        setError(null);
      } catch (err) {
        setError(err);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    }
  }, [result]);

  return {
    data,
    isLoading,
    error,
  };
};

export const useConvexMutation = (mut) => {
    const mutFn = useMutation(mut);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const mutationFunction = async(...args) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const res = await mutFn(...args);
            setData(res);
            return res;
        } catch (error) {
            setError(error);
            toast.error(error.message);
            throw error;
        }

        finally {
            setIsLoading(false);
        }
    }

    return {mutationFunction, data, isLoading, error};
}