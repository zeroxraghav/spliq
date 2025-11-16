import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useEffect } from "react";

const CategorySelector = ({ categories, onChange }) => {
  const [selectedCategory, setSelectedCategory] = useState("");

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    if (onChange && categoryId !== selectedCategory) {
      onChange(categoryId);
    }
  };

  // If no categories or empty categories array
  if (!categories || categories.length === 0) {
    return <div>No categories available</div>;
  }

  if (!selectedCategory && categories.length > 0) {
    // Find a default category or use the first one
    const defaultCategory =
      categories.find((cat) => cat.isDefault) || categories[0];

    // Set the default without triggering a re-render loop
    setTimeout(() => {
      setSelectedCategory(defaultCategory.id);
      if (onChange) {
        onChange(defaultCategory.id);
      }
    }, 0);
  }

  return (
    <Select value={selectedCategory} onValueChange={handleCategoryChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Categories</SelectLabel>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <div className="flex items-center gap-2">
                <span>{c.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default CategorySelector;
